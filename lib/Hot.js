/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var bufferEqual = require("buffer-equal");

function getModulesFromContents(updatedContents, requests) {
	return requests.filter(function(request) {
		var content = request.split("!").pop();
		return updatedContents.indexOf(content) >= 0;
	});
}

function watch(filename, currentContent, callback) {
	var fired = false;
	fs.readFile(filename, function(err, content) {
		if(fired) return;
		if(err) return callback(err);
		if(!bufferEqual(content, currentContent)) {
			fired = true;
			callback();
		}
	});
	var watcher = fs.watch(filename, { persistent: false }, function() {
		if(fired) return;
		fired = true;
		callback();
	});
	return watcher;
}

function onContentChange(filename) {
	this.contentWatchers[filename].close();
	delete this.contentWatchers[filename];

	this.updatedContents.push(filename);
	if(this.status == "watch") {
		this.status = "watch-delay";
		startWatchDelay.call(this);
	} else if(this.status == "watch-delay") {
		startWatchDelay.call(this);
	}
}

function startWatchDelay() {
	clearTimeout(this.timeout);
	this.timeout = setTimeout(updateModules.bind(this, function() {}), this.options.watchDelay);
}

/**
 * bubbleUpdate(updatedModules: Module[], cache: {id: Module}, updateDependencies: {moduleId: string[]}, entryModule: Module) -> "accept"|"decline"|"bubble"
 */
function bubbleUpdate(updatedModules, cache, updateDependencies, entryModule) {
	var queue = updatedModules.slice();
	while(queue.length > 0) {
		var module = queue.pop();
		if(module.hot.acceptUpdate)
			continue;
		if(module.hot.declineUpdate)
			return "decline";
		for(var i = 0; i < module.parents.length; i++) {
			var parentId = module.parents[i];
			var parent = cache[parentId];
			if(updatedModules.indexOf(parent) >= 0) continue;
			if(!parent || parent === entryModule)
				return "bubble"
			if(parent.hot.declineDependencies[module.id])
				return "decline";
			if(parent.hot.acceptDependencies[module.id]) {
				if(!updateDependencies[parentId]) updateDependencies[parentId] = [];
				if(updateDependencies[parentId].indexOf(module) >= 0) continue;
				updateDependencies[parentId].push(module);
				continue;
			}
			delete updateDependencies[parentId];
			updatedModules.push(parent);
			queue.push(parent);
		}
	}
	return "accept";
}

function updateModules(callback) {
	var contentCache = this.contentCache;
	var sourceCache = this.sourceCache;
	var cache = this.cache;
	var dataObj = this.data;
	var updatedContents = this.updatedContents;

	// get modules from contents
	var updatedModulesFilenames = getModulesFromContents(updatedContents, Object.keys(cache));
	var updatedModules = updatedModulesFilenames.map(function(key) { return cache[key]; });

	// bubble update
	var updateDependencies = {};
	var result = bubbleUpdate(updatedModules, cache, updateDependencies, this.main);
	if(result != "accept") {
		var err = new Error("Cannot do hot update: " + result);
		this.error = err;
		this.status = "abort";
		return callback(err);
	}

	// remove update flags, as we reload them now
	this.updatedContents = [];

	this.update = {
		updatedContents: updatedContents,
		updatedModules: updatedModules,
		updateDependencies: updateDependencies
	};

	if(this.applyOnUpdate)
		applyUpdate.call(this, callback);
	else {
		this.status = "ready";
		callback(null, updatedModules);
	}
}

function applyUpdate(callback) {
	var contentCache = this.contentCache;
	var sourceCache = this.sourceCache;
	var cache = this.cache;
	var dataObj = this.data;
	var updatedContents = this.update.updatedContents;
	var updatedModules = this.update.updatedModules;
	var updateDependencies = this.update.updateDependencies;

	this.status = "dispose";

	// 1. dispose
	updatedModules.forEach(function(m) {
		var data = {};
		m.hot.disposeHandlers.forEach(function(cb) {
			cb(data);
		});
		dataObj[m.id] = data;
	});

	this.status = "apply";

	// 2. remove modules
	updatedContents.forEach(function(filename) {
		delete contentCache[filename];
	});
	updatedModules.forEach(function(m) {
		delete sourceCache[m.id];
		delete cache[m.id];
		if(m.children) m.children.forEach(function(c) {
			var idx = c.parents.indexOf(m.id);
			if(idx >= 0) c.parents.splice(idx, 1);
		});
	});
	Object.keys(updateDependencies).forEach(function(moduleId) {
		var module = cache[moduleId];
		var updated = updateDependencies[moduleId];
		updated.forEach(function(dep) {
			var idx = module.children.indexOf(dep);
			if(idx >= 0)
				module.children.splice(idx, 1);
		});
	});

	// 3. notify parents about dependencies
	Object.keys(updateDependencies).forEach(function(moduleId) {
		var module = cache[moduleId];
		var updated = updateDependencies[moduleId];
		var callbacks = [];
		updated.forEach(function(dep) {
			var cb = module.hot.acceptDependencies[dep.id];
			if(callbacks.indexOf(cb) >= 0) return;
			callbacks.push(cb);
		});
		callbacks.forEach(function(cb) {
			try {
				cb(updated);
			} catch(err) {
				this.error = err;
				this.status = "fail";
				callback(err);
			}
		}, this);
	}, this);

	var oneDone = function() {
		if(--count == 0) next.call(this);
	}.bind(this);

	// 4. self update if self accepted
	var count = 1;
	updatedModules.forEach(function updateSelfAcceptedModules(m) {
		if(m.hot.acceptUpdate) {
			count++;
			// require must be here, because auf circular dep.
			var reqFn = require("./require").factory(null, this);
			reqFn([m.id], oneDone, function(err) {
				this.error = err;
				this.status = "fail";
				callback(err);
			}.bind(this));
		}
	}, this);
	oneDone();

	function next() {
		if(this.options.watch) {
			if(this.updatedContents.length > 0) {
				this.status = "watch-delay";
				startWatchDelay.call(this);
			} else {
				this.status = "watch";
			}
		} else {
			this.status = "idle";
		}
		callback(null, updatedModules);
	}
}

function Hot(module, reqObj) {
	this._module = module;
	this._reqObj = reqObj;
	this.disposeHandlers = [];
	this.acceptDependencies = {};
	this.declineDependencies = {};
	this.acceptUpdate = false;
	this.declineUpdate = false;

	if(reqObj.options.watch && module !== reqObj.main) {
		var filename = module.id.split("!").pop();
		if(!reqObj.base.contentWatchers[filename]) {
			var currentContent = reqObj.base.contentCache[filename];
			if(!currentContent) throw new Error("!currentContent");
			reqObj.base.contentWatchers[filename] = watch(filename, currentContent, onContentChange.bind(reqObj.base, filename));
		}
	}
}
module.exports = Hot;

Hot.prototype.accept = function accept(arg1, arg2) {
	if(Array.isArray(arg1)) {
		// accept(dependencies: string[], callback: () -> void)
		// accept updates of some dependencies
		var dependencies = arg1;
		var callback = arg2;

		dependencies.forEach(function(dep) {
			dep = this._reqObj.require.resolve(dep);
			this.acceptDependencies[dep] = callback;
		}, this);
	} else if(typeof arg1 == "string") {
		// accept(dependency: string, callback: () -> void)
		return accept.call(this, [arg1], arg2);
	} else {
		// accept()
		// disable bubbling of update event

		this.acceptUpdate = true;
	}
}

Hot.prototype.decline = function decline(arg) {
	if(Array.isArray(arg1)) {
		// decline(dependencies: string[])
		// decline updates of some dependencies
		var dependencies = arg;

		dependencies.forEach(function(dep) {
			dep = this._reqObj.require.resolve(dep);
			this.declineDependencies[dep] = true;
		}, this);
	} else if(typeof arg1 == "string") {
		// decline(dependency: string)
		return decline.call(this, [arg]);
	} else {
		// decline()
		// abort update on update event

		this.declineUpdate = true;
	}
}

Hot.prototype.dispose =
Hot.prototype.addDisposeHandler = function addDisposeHandler(callback) {
	if(this.disposeHandlers.indexOf(callback) >= 0) return false;
	this.disposeHandlers.push(callback);
	return true;
}

Hot.prototype.removeDisposeHandler = function removeDisposeHandler(callback) {
	var idx = this.disposeHandlers.indexOf(callback);
	if(idx < 0) return false;
	this.disposeHandlers.splice(idx, 1);
	return true;
}

Hot.prototype.setApplyOnUpdate = function(flag) {
	this._reqObj.base.applyOnUpdate = flag;
}

Hot.prototype.status = function() {
	return this._reqObj.status;
};

Hot.prototype.check = function(callback) {
	var reqObj = this._reqObj.base;
	if(reqObj.status != "idle")
		return callback(new Error("Not in idle state, cannot check for update"));
	reqObj.status = "check";

	var contentCache = reqObj.contentCache
	var contents = Object.keys(contentCache);
	var count = contents.length;
	var updatedContents = [];
	contents.forEach(function(filename) {
		fs.readFile(filename, function(err, content) {
			if(!bufferEqual(content, contentCache[filename]))
				updatedContents.push(filename);
			oneDone();
		});
	});

	function oneDone() {
		if(--count == 0) {
			reqObj.updatedContents = updatedContents;
			updateModules.call(reqObj, callback);
		}
	}
}

Hot.prototype.apply = function(callback) {
	var reqObj = this._reqObj.base;
	if(reqObj.status != "ready")
		return callback(new Error("Not in ready state, cannot apply a update"));
	applyUpdate.call(reqObj, callback);
}