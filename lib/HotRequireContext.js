var RequireContext = require("./RequireContext");

function HotRequireContext(parent, root) {
	RequireContext.call(this, parent, root);

	this.disposeHandlers = [];
	this.acceptDependencies = {};
	this.declineDependencies = {};
	this.acceptUpdate = false;
	this.declineUpdate = false;
}

module.exports = HotRequireContext;

HotRequireContext.prototype = Object.create(RequireContext.prototype);

HotRequireContext.prototype.createRequire = function createRequire() {
	RequireContext.prototype.createRequire.call(this);

	this.require.hot = {};

	this.require.hot._requireContext = this;

	if(this.module) this.require.hot.data = this.root.data[this.module.id];

	this.require.hot.accept = this.accept.bind(this);
	this.require.hot.decline = this.decline.bind(this);
	this.require.hot.dispose = this.dispose.bind(this);
	this.require.hot.addDisposeHandler = this.addDisposeHandler.bind(this);
	this.require.hot.removeDisposeHandler = this.removeDisposeHandler.bind(this);

	this.require.hot.setApplyOnUpdate = this.root.setApplyOnUpdate.bind(this.root);
	this.require.hot.status = this.root.status.bind(this.root);
	// this.require.hot.addStatusHandler = this.root.addStatusHandler.bind(this.root);
	// this.require.hot.removeStatusHandler = this.root.removeStatusHandler.bind(this.root);
	this.require.hot.check = this.root.check.bind(this.root);
	this.require.hot.apply = this.root.apply.bind(this.root);
	this.require.hot.stop = this.root.stop.bind(this.root);
}

HotRequireContext.prototype.accept = function accept(arg1, arg2) {
	if(Array.isArray(arg1)) {
		// accept(dependencies: string[], callback: () -> void)
		// accept updates of some dependencies
		var dependencies = arg1;
		var callback = arg2;

		dependencies.forEach(function(dep) {
			dep = this.require.resolve(dep);
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

HotRequireContext.prototype.decline = function decline(arg) {
	if(Array.isArray(arg)) {
		// decline(dependencies: string[])
		// decline updates of some dependencies
		var dependencies = arg;

		dependencies.forEach(function(dep) {
			dep = this.require.resolve(dep);
			this.declineDependencies[dep] = true;
		}, this);
	} else if(typeof arg == "string") {
		// decline(dependency: string)
		return decline.call(this, [arg]);
	} else {
		// decline()
		// abort update on update event

		this.declineUpdate = true;
	}
}

HotRequireContext.prototype.dispose =
HotRequireContext.prototype.addDisposeHandler = function addDisposeHandler(callback) {
	if(this.disposeHandlers.indexOf(callback) >= 0) return false;
	this.disposeHandlers.push(callback);
	return true;
}

HotRequireContext.prototype.removeDisposeHandler = function removeDisposeHandler(callback) {
	var idx = this.disposeHandlers.indexOf(callback);
	if(idx < 0) return false;
	this.disposeHandlers.splice(idx, 1);
	return true;
}
