var RequireContext = require("./RequireContext");

function RequireRoot(parent, options) {
	this.main = parent;
	this.options = options;
	this.cache = {};
	this.sourceCache = {};
	this.contentCache = {};
	this.loadingContent = {};
	this.loadingSource = {};
}

module.exports = RequireRoot;

RequireRoot.prototype.createContext = function(module) {
	var context = new RequireContext(module, this);
	context.createRequire();
	return context;
}

RequireRoot.prototype.setDependencies = function() {}