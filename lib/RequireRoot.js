var path = require("path");

var RequireContext = require("./RequireContext");
var ModuleFactory = require("./ModuleFactory");
var Resolver = require("enhanced-resolve/lib/Resolver");
var NodeJsInputFileSystem = require("enhanced-resolve/lib/NodeJsInputFileSystem");
var SyncNodeJsInputFileSystem = require("enhanced-resolve/lib/SyncNodeJsInputFileSystem");
var CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");
var ModulesInDirectoriesPlugin = require("enhanced-resolve/lib/ModulesInDirectoriesPlugin");
var ModuleTemplatesPlugin = require("enhanced-resolve/lib/ModuleTemplatesPlugin");
var ModuleAsFilePlugin = require("enhanced-resolve/lib/ModuleAsFilePlugin");
var ModuleAsDirectoryPlugin = require("enhanced-resolve/lib/ModuleAsDirectoryPlugin");
var DirectoryDefaultFilePlugin = require("enhanced-resolve/lib/DirectoryDefaultFilePlugin");
var DirectoryDescriptionFilePlugin = require("enhanced-resolve/lib/DirectoryDescriptionFilePlugin");
var FileAppendPlugin = require("enhanced-resolve/lib/FileAppendPlugin");

function RequireRoot(parent, options) {
	this.main = parent;
	if(parent.context) {
		this.context = parent.context;
	} else if(parent.filename) {
		this.context = path.dirname(parent.filename);
	}
	this.options = options;
	this.cache = {};
	this.preCache = {};
	this.preLoading = {};
	this.fileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 10000);
	this.syncFileSystem = new CachedInputFileSystem(new SyncNodeJsInputFileSystem(), 10000);
	this.resolvers = {
		normal: new Resolver(this.fileSystem),
		normalSync: new Resolver(this.syncFileSystem),
		loader: new Resolver(this.fileSystem),
		loaderSync: new Resolver(this.syncFileSystem),
	};
	(function() {
		this.resolvers.normal.apply.apply(this.resolvers.normal, arguments);
		this.resolvers.normalSync.apply.apply(this.resolvers.normalSync, arguments);
	}.call(this,
		new ModulesInDirectoriesPlugin("node", ["node_modules"]),
		new ModuleAsFilePlugin("node"),
		new ModuleAsDirectoryPlugin("node"),
		new DirectoryDescriptionFilePlugin("package.json", ["main"]),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(["", ".js", ".node"])
	));
	(function() {
		this.resolvers.loader.apply.apply(this.resolvers.loader, arguments);
		this.resolvers.loaderSync.apply.apply(this.resolvers.loaderSync, arguments);
	}.call(this,
		new ModulesInDirectoriesPlugin("loader-module", ["node_loaders", "node_modules"]),
		new ModuleTemplatesPlugin("loader-module", ["*-loader", "*"], "node"),
		new ModuleAsFilePlugin("node"),
		new ModuleAsDirectoryPlugin("node"),
		new DirectoryDescriptionFilePlugin("package.json", ["loader", "main"]),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin([".loader.js", "", ".js"])
	));
	this.moduleFactory = new ModuleFactory("", this.resolvers, options);
}

module.exports = RequireRoot;

RequireRoot.prototype.createContext = function(module) {
	var context = new RequireContext(module, this);
	context.createRequire();
	return context;
}

RequireRoot.prototype.setDependencies = function() {}