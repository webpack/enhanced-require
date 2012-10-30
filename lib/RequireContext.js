var fs = require("fs");
var path = require("path");
var clone = require("clone");
var execModule = require("./execModule");
var execLoaders = require("./execLoaders");
var resolve = require("enhanced-resolve");


var natives = process.binding("natives");
function requireNativeModule(name) {
	return require(name);
}
function existsNativeModule(name) {
	return natives.hasOwnProperty(name);
}

// Helpers

function mapAsync(array, fn, callback) {
	var count = array.length;
	if(count == 0) return callback(null, array);
	var results = array.slice(0);
	array.forEach(function(item, idx) {
		fn(item, function(err, result) {
			if(count < 0) return;
			if(err) {
				count = -1;
				return callback(err);
			}
			results[idx] = result;
			count--;
			if(count == 0) {
				return callback(null, results);
			}
		});
	});
}

function applyToAll(array, callback) {
	return function(err, result) {
		if(!err && callback) result = callback(result);
		array.forEach(function(fn) {
			fn(err, result);
		});
	}
}

function addToSet(set, item) {
	if(!set) return [item];
	if(set.indexOf(item) >= 0) return set;
	set.push(item);
	return set;
}

// the class

function RequireContext(parent, root) {
	this.root = root;
	this.module = parent;
	this.context = (!parent) ? "" : parent.id === "." ? process.cwd() : path.dirname(parent.id.split("!").pop());
}

module.exports = RequireContext;

RequireContext.prototype.createRequire = function createRequire() {
	var require = this.require = this.theRequire.bind(this);
	require.options = this.root.options;
	require.cache = this.root.cache;
	require.sourceCache = this.root.sourceCache;
	require.contentCache = this.root.contentCache;
	require.enhanced = this.root.options.enhanced;
	require.amd = this.root.options.amd;

	require.resolve = this.theResolve.bind(this);
	require.ensure = this.theEnsure.bind(this);
	require.context = this.theContext.bind(this);
	require.define = this.theDefine.bind(this);
};

/**
 * any require(string module) - sync require
 * void require(array modules, function callback(modules...), [function errorCallback(err)]) - async require
 * void require(array modules) - async require
 */
RequireContext.prototype.theRequire = function theRequire(modules, callback, errorCallback) {
	var parent = this.module;
	var context = this.context;
	if(Array.isArray(modules)) {
		this.theEnsure(modules, function(req, err) {
			if(err && errorCallback) return errorCallback(err);
			var reqModules = modules.map(function(n) { return req(n) });
			if(callback) callback.apply(null, reqModules);
		});

	} else {
		if(callback) throw new Error("require(string, callback) is not a valid signature. You may want to call require(array, function).");

		// check native module
		if(existsNativeModule(modules)) return requireNativeModule(modules);

		// resolve filename
		var filename = resolve.sync(context, modules, this.root.options.resolve);

		// check in cache
		var cache = this.root.cache;
		if(cache[filename]) {
			var m = cache[filename];
			if(parent) {
				m.parents = addToSet(m.parents, parent.id);
				parent.children = addToSet(parent.children, m);
			}
			return m.exports;
		}

		// split loaders from resource
		var filenameWithLoaders = filename;
		var loaders = filename.split(/!/g);
		filename = loaders.pop();

		// check for resource cache
		var content = this.root.contentCache[filename];
		if(!content) {
			content = this.root.contentCache[filename] = fs.readFileSync(filename);
		}

		// execute the loaders
		var source = this.root.sourceCache[filenameWithLoaders];
		if(!source) {
			source =
			this.root.sourceCache[filenameWithLoaders] =
				execLoaders.sync(
					context,
					filenameWithLoaders,
					loaders, [filename],
					[content],
					{
						loaderType: "loader"
					},
					null,
					this.root.options
				)[0].toString("utf-8");
		}

		this.root.setDependencies(filenameWithLoaders, [filename]);

		// load the source code
		var exec = execModule(
			source,
			parent,
			filenameWithLoaders,
			filename,
			loaders.length > 0 || this.root.options.recursive,
			this.root.options,
			this.root
		);

		// add to cache
		cache[filenameWithLoaders] = exec.module;

		// make dependency graph
		if(parent) {
			exec.module.parents = [parent.id];
			parent.children.push(exec.module);
		}

		// execute
		return exec();
	}
}

RequireContext.prototype.theResolve = function theResolve(name, callback) {
	if(callback) {
		if(existsNativeModule(name)) return callback(null, name);
		return resolve(this.context, name, this.root.options.resolve, callback);
	} else {
		if(existsNativeModule(name)) return name;
		return resolve.sync(this.context, name, this.root.options.resolve);
	}
}

RequireContext.prototype.theEnsure = function theEnsure(modules, callback) {
	var context = this.context;
	var options = this.root.options;
	var cache = this.root.cache;
	var reqFn = this.require;
	var contentCache = this.root.contentCache;
	var sourceCache = this.root.sourceCache;
	var loadingContent = this.root.loadingContent;
	var loadingSource = this.root.loadingSource;
	mapAsync(modules, function(name, callback) {
		if(existsNativeModule(name)) return callback(null, name);
		resolve(context, name, callback);
	}, function(err, resolvedModules) {
		if(err) return callback(err);
		mapAsync(resolvedModules, function(resolvedModule, callback) {
			if(existsNativeModule(resolvedModule)) return callback();
			if(cache[resolvedModule]) return callback();
			if(sourceCache[resolvedModule]) return callback();

			// split loaders from resource
			var filenameWithLoaders = resolvedModule;
			var loaders = resolvedModule.split(/!/g);
			var filename = loaders.pop();

			if(contentCache[filename]) return makeSource(null, contentCache[filename]);
			return loadContent();

			function loadContent() {
				if(!loadingContent[filename]) {
					loadingContent[filename] = [makeSource];
					fs.readFile(filename, applyToAll(loadingContent[filename], function(content) {
						if(!contentCache[filename])
							contentCache[filename] = content;
						delete loadingContent[filename];
						return contentCache[filename];
					}));
				} else
					loadingContent[filename].push(makeSource);
			}
			function makeSource(err, content) {
				if(err) return callback(err);
				if(!loadingSource[filenameWithLoaders]) {
					loadingSource[filenameWithLoaders] = [callback];
					var finished = applyToAll(loadingSource[filenameWithLoaders], function(content) {
						if(!sourceCache[filenameWithLoaders])
							sourceCache[filenameWithLoaders] = content;
						delete loadingSource[filenameWithLoaders];
						return sourceCache[filenameWithLoaders];
					});
					execLoaders(
						context,
						filenameWithLoaders,
						loaders, [filename],
						[content],
						null,
						null,
						options,
						function(err, sources) {
							if(err) return finished(err);
							if(sources[0] instanceof Buffer || typeof sources[0] == "string")
								finished(null, sources[0].toString("utf-8"));
							else
								callback(new Error("Loader result is not a Buffer or string"));
						}
					)
				} else
					loadingSource[filenameWithLoaders].push(callback);
			}
		}, function(err) {
			return callback(reqFn, err);
		})
	});
}

RequireContext.prototype.theDefine = function theDefine(dependencies, fn, arg3) {
	var parent = this.module;
	var withName = false;
	if(typeof dependencies == "string") {
		// pop name
		dependencies = fn;
		fn = arg3;
		withName = true;
	}
	if(Array.isArray(dependencies)) {
		this.theEnsure(dependencies, function(req) {
			parent.exports = fn.apply(null, dependencies.map(function(n) { return req(n) }));
		});
	} else if(withName) {
		fn = dependencies;
		if(typeof fn == "function")
			parent.exports = fn();
		else
			parent.exports = fn;
	} else {
		fn = dependencies;
		if(typeof fn == "function")
			fn(require, parent.exports, parent);
		else
			parent.exports = fn;
	}
}

RequireContext.prototype.theContext = function theContext(contextName) {
	return function(name) {
		if(typeof name != "string" || name.substr(0, 2) != "./")
			throw new Error("A function created by require.context must be called with a string beginning with './'");
		return this.theRequire(contextName + "/" + name);
	}.bind(this);
}


