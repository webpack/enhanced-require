var fs = require("fs");
var path = require("path");
var bufferEqual = require("buffer-equal");
var HotRequireContext = require("./HotRequireContext");
var RequireRoot = require("./RequireRoot");

function HotRequireRoot(parent, options) {
	RequireRoot.call(this, parent, options);

	this.data = {};
	var status = options.watch ? "watch" : "idle"
	Object.defineProperty(this, "_status", {
		get: function() { return status },
		set: function(v) {
			status = v;
		}
	});

	this.dependenciesRequestMap = {};
	this.dependenciesResourceMap = {};
	this.resources = {};

	this.changedResources = {};

	this.applyOnUpdate = options.applyOnUpdate !== false;

	this.lastTimestamp = Math.floor(new Date().getTime() / 1000) * 1000;
}

module.exports = HotRequireRoot;

HotRequireRoot.prototype = Object.create(RequireRoot.prototype);

HotRequireRoot.prototype.createContext = function createContext(module) {
	var context = new HotRequireContext(module, this);
	context.createRequire();
	return context;
}

HotRequireRoot.prototype.setDependencies = function setDependencies(request, dependencies) {
	if(this.dependenciesRequestMap[request]) {
		Object.keys(this.dependenciesRequestMap[request]).forEach(function(resource) {
			delete this.dependenciesResourceMap[resource][request];
		}, this);
	}
	var map = this.dependenciesRequestMap[request] = {};
	dependencies.forEach(function(resource) {
		map[resource] = true;
		if(!this.dependenciesResourceMap[resource]) this.dependenciesResourceMap[resource] = {};
		this.dependenciesResourceMap[resource][request] = true;
		if(!this.resources[resource])
			this.resources[resource] = this._createResourceLink(resource);
	}, this);
}

//// module.hot ////

HotRequireRoot.prototype.status = function status() {
	return this._status;
};

HotRequireRoot.prototype.error = function error() {
	return this._error;
};

HotRequireRoot.prototype.setApplyOnUpdate = function setApplyOnUpdate(flag) {
	this.applyOnUpdate = flag;
}

HotRequireRoot.prototype.check = function check(callback) {
	if(this.status() != "idle") throw new Error("status() must be 'idle', when calling apply()");
	this._enumerateOutdatedResources(function(err) {
		if(err) return callback(err);
		if(this.outdatedResources.length == 0) {
			this._status = "idle";
			return callback();
		}
		this._prepareUpdate(function(err) {
			if(err) return callback(err);

			if(this.applyOnUpdate) this._apply(callback);
			else return callback(null, this.outdatedModules);
		}.bind(this));
	}.bind(this));
}

HotRequireRoot.prototype.apply = function apply(callback) {
	if(this.status() != "ready") throw new Error("status() must be 'ready', when calling apply()");
	this._apply(callback);
}

HotRequireRoot.prototype.peekWatch = function(callback) {
	if(this.status() != "watch-delay") throw new Error("status() must be 'watch-delay', when calling peekWatch()");
	if(this._watchDelayTimeout) clearTimeout(this._watchDelayTimeout);
	this._peekWatch(callback);
}

HotRequireRoot.prototype.stop = function() {
	if(this._watchDelayTimeout) clearTimeout(this._watchDelayTimeout);
	Object.keys(this.resources).forEach(function(res) {
		this._disposeResourceLink(this.resources[res]);
		delete this.resources[res];
	}, this);
	this.options.watch = false;
}

//// protected ////

HotRequireRoot.prototype._createResourceLink = function _createResourceLink(resource) {
	if(this.options.watch) {
		var readFileEnabled = true;
		var onChange = function() {
			readFileEnabled = false;
			this.changedResources[resource] = true;
			this._changed();
		}.bind(this);
		var timeout = setTimeout(function() {
			fs.stat(resource, function(err, stat) {
				if(err) return onChange();
				if(stat.mtime.getTime() >= this.lastTimestamp) return onChange();
			}.bind(this));
		}, 1100);
		var watcher = fs.watch(resource, { persistent: false }, function() {
			fs.stat(resource, function(err, stat) {
				if(err) return onChange();
				if(stat.mtime.getTime() >= this.lastTimestamp) return onChange();
			}.bind(this));
		}.bind(this));
		return {
			close: function() {
				watcher.close();
				clearTimeout(timeout);
			}
		}
	} else {
		return true;
	}
}

HotRequireRoot.prototype._disposeResourceLink = function _disposeResourceLink(resourceLink) {
	if(this.options.watch) {
		resourceLink.close();
	}
}

HotRequireRoot.prototype._changed = function() {
	if(this._status != "watch" && this._status != "watch-delay") return;
	if(this.options.watchDelay === 0) return this._peekWatch();
	if(this._status == "watch") this._status = "watch-delay";
	if(this._watchDelayTimeout) {
		clearTimeout(this._watchDelayTimeout);
	} else {
		this.lastTimestamp = Math.floor(new Date().getTime() / 1000) * 1000;
		this.fileSystem.purge();
		this.syncFileSystem.purge();
	}
	this._watchDelayTimeout = setTimeout(this._peekWatch.bind(this, this._onAutomaticPeekWatchResult.bind(this)), this.options.watchDelay);
}

HotRequireRoot.prototype._onAutomaticPeekWatchResult = function(err, result) {
	if(typeof this.options.onAutomaticCheck === "function") {
		return this.options.onAutomaticCheck(err, result);
	}
	if(err) throw err;
}

HotRequireRoot.prototype._peekWatch = function(callback) {
	if(this._watchDelayTimeout) {
		clearTimeout(this._watchDelayTimeout);
		this._watchDelayTimeout = 0;
	}
	this.currentChangedResources = {};
	Object.keys(this.changedResources).forEach(function(resource) {
		this.currentChangedResources[resource] = this.changedResources[resource];
	}, this);
	this.changedResources = {};
	this.lastTimestamp = Math.floor(new Date().getTime() / 1000) * 1000;

	this.outdatedResources = Object.keys(this.currentChangedResources);

	if(this.outdatedResources.length == 0) {
		this._status = "watch";
		return callback();
	}
	this._prepareUpdate(function(err) {
		if(err) return callback(err);
		if(this.applyOnUpdate) this._apply(callback);
		else return callback(null, this.outdatedModules);
	}.bind(this));
}

HotRequireRoot.prototype._enumerateOutdatedResources = function _enumerateOutdatedResources(callback) {
	this._status = "check";

	this.outdatedResources = [];

	var resources = Object.keys(this.resources);
	var count = resources.length;
	var newTs = Math.floor(new Date().getTime() / 1000) * 1000;
	this.fileSystem.purge();
	this.syncFileSystem.purge();
	// have to wait at least 1s because of timestamps accuracy in fs
	setTimeout(function() {
		resources.forEach(function(resource) {
			fs.stat(resource, function(err, stat) {
				if(err || !stat || stat.mtime.getTime() > this.lastTimestamp) {
					this.outdatedResources.push(resource);
				}
				return oneDone.call(this);
			}.bind(this));
		}, this);
	}.bind(this), 1100);

	function oneDone() {
		if(--count == 0) {
			this.lastTimestamp = newTs;
			return callback();
		}
	}
}

HotRequireRoot.prototype._prepareUpdate = function _prepareUpdate(callback) {
	this._status = "prepare";

	this.outdatedModules = [];

	this.outdatedResources.forEach(function(resource) {
		var modules = this.dependenciesResourceMap[resource];
		Object.keys(modules).forEach(function(moduleId) {
			var module = this.cache[moduleId];
			if(module) this.outdatedModules.push(module);
		}, this);
	}, this);

	this.outdatedDependencies = {};

	var queue = this.outdatedModules.slice();
	while(queue.length > 0) {
		var module = queue.pop();
		if(module.hot._requireContext.acceptUpdate)
			continue;
		if(module.hot._requireContext.declineUpdate) {
			this._status = "abort";
			return callback(new Error("Aborted because of self decline"));
		}
		if(module.parents.length === 0) {
			this._status = "abort";
			return callback(new Error("Aborted because of bubbling"));
		}
		for(var i = 0; i < module.parents.length; i++) {
			var parentId = module.parents[i];
			var parent = this.cache[parentId];
			if(this.outdatedModules.indexOf(parent) >= 0) continue;
			if(!parent || parent === this.main) {
				this._status = "abort";
				return callback(new Error("Aborted because of bubbling"));
			}
			if(parent.hot._requireContext.declineDependencies[module.id]) {
				this._status = "abort";
				return callback(new Error("Aborted because of declined dependency"));
			}
			if(parent.hot._requireContext.acceptDependencies[module.id]) {
				if(!this.outdatedDependencies[parentId]) this.outdatedDependencies[parentId] = [];
				if(this.outdatedDependencies[parentId].indexOf(module) >= 0) continue;
				this.outdatedDependencies[parentId].push(module);
				continue;
			}
			delete this.outdatedDependencies[parentId];
			this.outdatedModules.push(parent);
			queue.push(parent);
		}
	}

	this._status = "ready";
	return callback();
}

HotRequireRoot.prototype._apply = function _apply(callback) {
	this._dispose(function(err) {
		if(err) return callback(err);
		this._notifyDependencies(function(err) {
			if(err) return callback(err);
			this._loadSelfAccepted(function(err) {
				if(err) return callback(err);
				this._finishApply(callback);
			}.bind(this));
		}.bind(this));
	}.bind(this));
}

HotRequireRoot.prototype._dispose = function _dispose(callback) {
	this._status = "dispose";

	this.outdatedModules.forEach(function(module) {
		var data = {};
		module.hot._requireContext.disposeHandlers.forEach(function(cb) {
			cb(data);
		});
		this.data[module.id] = data;
	}, this);

	this.outdatedResources.forEach(function(resource) {
		this._disposeResourceLink(this.resources[resource]);
		delete this.resources[resource];
	}, this);
	this.outdatedModules.forEach(function(module) {
		delete this.preCache[module.id];
		delete this.cache[module.id];
		if(module.children) {
			module.children.forEach(function(child) {
				var idx = child.parents.indexOf(module.id);
				if(idx >= 0) child.parents.splice(idx, 1);
			}, this);
		}
	}, this);
	Object.keys(this.outdatedDependencies).forEach(function(moduleId) {
		var module = this.cache[moduleId];
		var outdatedDependencies = this.outdatedDependencies[moduleId];
		outdatedDependencies.forEach(function(dependency) {
			var idx = module.children.indexOf(dependency);
			if(idx >= 0) module.children.splice(idx, 1);
		});
	}, this);

	return callback();
}

HotRequireRoot.prototype._notifyDependencies = function _notifyDependencies(callback) {
	var error = null;
	Object.keys(this.outdatedDependencies).forEach(function(moduleId) {
		var module = this.cache[moduleId];
		var outdatedDependencies = this.outdatedDependencies[moduleId];
		var callbacks = [];
		outdatedDependencies.forEach(function(dependency) {
			var cb = module.hot._requireContext.acceptDependencies[dependency.id];
			if(callbacks.indexOf(cb) >= 0) return;
			callbacks.push(cb);
		});
		callbacks.forEach(function(cb) {
			try {
				cb(outdatedDependencies);
			} catch(err) {
				if(!error)
					error = this._error = err;
			}
		}, this);
	}, this);

	if(error) {
		this._status = "fail";
		return callback(error);
	} else {
		return callback();
	}
}

HotRequireRoot.prototype._loadSelfAccepted = function _loadSelfAccepted(callback) {
	var error = null;

	var oneDone = function() {
		if(--count == 0) next.call(this);
	}.bind(this);

	var count = 1;
	this.outdatedModules.forEach(function updateSelfAcceptedModules(m) {
		if(m.hot._requireContext.acceptUpdate) {
			count++;
			m.hot._requireContext.require([m.id], oneDone, function(err) {
				if(!error)
					error = this._error = err;
			}.bind(this));
		}
	}, this);
	oneDone();

	function next() {
		if(error) {
			this._status = "fail";
			return callback(error);
		} else {
			return callback();
		}
	}
}

HotRequireRoot.prototype._finishApply = function(callback) {
	if(this.options.watch) {
		if(Object.keys(this.changedResources).length > 0) {
			this._status = "watch-delay";
		} else {
			this._status = "watch";
		}
	} else {
		this._status = "idle";
	}
	return callback(null, this.outdatedModules);
}



