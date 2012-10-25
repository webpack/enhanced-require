var fs = require("fs")

function Hot(module, reqObj) {
	this._module = module;
	this._reqObj = reqObj;
	this.disposeHandlers = [];
	this.acceptDependencies = {};
	this.declineDependencies = {};
	this.acceptUpdate = false;
	this.declineUpdate = false;
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

function getModulesFromContents(updatedContents, requests) {
	return requests.filter(function(request) {
		var content = request.split("!").pop();
		return updatedContents.indexOf(content) >= 0;
	});
}

Hot.prototype.checkSync = function() {
	// TODO better checking
	var contentCache = this._reqObj.contentCache;
	var sourceCache = this._reqObj.sourceCache;
	var cache = this._reqObj.cache;
	var require = this._reqObj.require;
	var dataObj = this._reqObj.data;
	var contents = Object.keys(contentCache);
	var updatedContents = contents.filter(function(filename) {
		return contentCache[filename].toString("base64") != fs.readFileSync(filename).toString("base64");
	});
	var updatedModules = getModulesFromContents(updatedContents, Object.keys(cache));
	updatedModules = updatedModules.map(function(key) { return cache[key]; });
	var updateDependencies = {};
	var result = Hot.bubbleUpdate(updatedModules, this._reqObj.cache, updateDependencies);
	if(result != "accept") throw new Error("Cannot do hot update: " + result);

	// 1. dispose
	updatedModules.forEach(function(m) {
		var data = {};
		m.hot.disposeHandlers.forEach(function(cb) {
			cb(data);
		});
		dataObj[m.id] = data;
	});

	// 2. clean cache
	updatedContents.forEach(function(filename) {
		delete contentCache[filename];
	});
	updatedModules.forEach(function(m) {
		delete sourceCache[m.id];
		delete cache[m.id];
	});

	// 3. notify parents about dependencies
	Object.keys(updateDependencies).forEach(function(moduleId) {
		var module = cache[moduleId];
		var updated = updateDependencies[moduleId];
		var callbacks = [];
		updated.forEach(function(dep) {
			var idx = module.children.indexOf(dep);
			if(idx >= 0)
				module.children.splice(idx, 1);

			var cb = module.hot.acceptDependencies[dep.id];
			if(callbacks.indexOf(cb) >= 0) return;
			callbacks.push(cb);
		});
		callbacks.forEach(function(cb) {
			cb(updated);
		});
	});
	
	return result;
}

/**
 * bubbleUpdate(updatedModules: Module[], cache: {id: Module}, updateDependencies: {moduleId: string[]}) -> "accept"|"decline"|"bubble"
 */
Hot.bubbleUpdate = function bubbleUpdate(updatedModules, cache, updateDependencies) {
	var queue = updatedModules.slice();
	while(queue.length > 0) {
		var module = queue.pop();
		if(!module.hot) throw new Error(module.id);
		if(module.hot.acceptUpdate)
			continue;
		if(module.hot.declineUpdate)
			return "decline";
		for(var i = 0; i < module.parents.length; i++) {
			var parentId = module.parents[i];
			var parent = cache[parentId];
			if(updatedModules.indexOf(parent) >= 0) continue;
			if(!parent)
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