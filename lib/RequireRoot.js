var path = require("path");

var RequireContext = require("./RequireContext");
var ModuleFactory = require("./ModuleFactory");
var Resolver = require("enhanced-resolve/lib/Resolver");
var NodeJsInputFileSystem = require("enhanced-resolve/lib/NodeJsInputFileSystem");
var SyncNodeJsInputFileSystem = require("enhanced-resolve/lib/SyncNodeJsInputFileSystem");
var CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");
var ModulesInDirectoriesPlugin = require("enhanced-resolve/lib/ModulesInDirectoriesPlugin");
var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");
var ModuleTemplatesPlugin = require("enhanced-resolve/lib/ModuleTemplatesPlugin");
var ModuleAsFilePlugin = require("enhanced-resolve/lib/ModuleAsFilePlugin");
var ModuleAsDirectoryPlugin = require("enhanced-resolve/lib/ModuleAsDirectoryPlugin");
var DirectoryDefaultFilePlugin = require("enhanced-resolve/lib/DirectoryDefaultFilePlugin");
var DirectoryDescriptionFilePlugin = require("enhanced-resolve/lib/DirectoryDescriptionFilePlugin");
var DirectoryResultPlugin = require("enhanced-resolve/lib/DirectoryResultPlugin");
var FileAppendPlugin = require("enhanced-resolve/lib/FileAppendPlugin");
var ModulesInRootPlugin = require("enhanced-resolve/lib/ModulesInRootPlugin");

function RequireRoot(parent, options) {
	this.main = parent;
	if(typeof parent === "string") {
		this.context = parent;
	} else if(parent.context) {
		this.context = parent.context;
	} else if(parent.filename) {
		this.context = path.dirname(parent.filename);
	} else this.context = options.context;
	this.options = options;
	this.cache = {};
	this.preCache = {};
	this.preLoading = {};
	this.fileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 10000);
	this.syncFileSystem = new CachedInputFileSystem(new SyncNodeJsInputFileSystem(), 10000);
	this.resolvers = {
		normal: new Resolver(this.fileSystem),
		normalSync: new Resolver(this.syncFileSystem),
		context: new Resolver(this.syncFileSystem),
		contextSync: new Resolver(this.syncFileSystem),
		loader: new Resolver(this.fileSystem),
		loaderSync: new Resolver(this.syncFileSystem),
	};
	(function() {
		this.resolvers.normal.apply.apply(this.resolvers.normal, arguments);
		this.resolvers.normalSync.apply.apply(this.resolvers.normalSync, arguments);
	}.call(this,
		new ModuleAliasPlugin(options.resolve.alias),
		makeRootPlugin("module", options.resolve.root),
		new ModulesInDirectoriesPlugin("module", options.resolve.modulesDirectories),
		makeRootPlugin("module", options.resolve.fallback),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryDescriptionFilePlugin("package.json", options.resolve.packageMains),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(options.resolve.extensions)
	));
	(function() {
		this.resolvers.context.apply.apply(this.resolvers.context, arguments);
		this.resolvers.contextSync.apply.apply(this.resolvers.contextSync, arguments);
	}.call(this,
		new ModuleAliasPlugin(options.resolve.alias),
		makeRootPlugin("module", options.resolve.root),
		new ModulesInDirectoriesPlugin("module", options.resolve.modulesDirectories),
		makeRootPlugin("module", options.resolve.fallback),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryResultPlugin()
	));
	(function() {
		this.resolvers.loader.apply.apply(this.resolvers.loader, arguments);
		this.resolvers.loaderSync.apply.apply(this.resolvers.loaderSync, arguments);
	}.call(this,
		new ModuleAliasPlugin(options.resolveLoader.alias),
		makeRootPlugin("loader-module", options.resolveLoader.root),
		new ModulesInDirectoriesPlugin("loader-module", options.resolveLoader.modulesDirectories),
		makeRootPlugin("loader-module", options.resolveLoader.fallback),
		new ModuleTemplatesPlugin("loader-module", options.resolveLoader.moduleTemplates, "node"),
		new ModuleAsFilePlugin("node"),
		new ModuleAsDirectoryPlugin("node"),
		new DirectoryDescriptionFilePlugin("package.json", options.resolveLoader.packageMains),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(options.resolveLoader.extensions)
	));
	this.moduleFactory = new ModuleFactory(this.context, this.resolvers, options.module);
}

module.exports = RequireRoot;

RequireRoot.prototype.createContext = function(module) {
	var context = new RequireContext(module, this);
	context.createRequire();
	return context;
}

RequireRoot.prototype.setDependencies = function() {}

function makeRootPlugin(name, root) {
	if(typeof root === "string")
		return new ModulesInRootPlugin(name, root);
	else if(Array.isArray(root)) {
		return function() {
			root.forEach(function(root) {
				this.apply(new ModulesInRootPlugin(name, root));
			}, this);
		}
	}
	return function() {};
}