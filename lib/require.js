/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var path = require("path");
var clone = require("clone");

var execModule = require("./execModule");
var execLoaders = require("./execLoaders");
var resolve = require("enhanced-resolve");

var options = {
	resolve: {
		loaders: [
			{test: /\.coffee$/, loader: "coffee"},
			{test: /\.json$/, loader: "json"},
			{test: /\.jade$/, loader: "jade"},
			{test: /\.css$/, loader: "style!css"},
			{test: /\.less$/, loader: "style!css!val!less"}
		],
		loaderExtensions: [".er-loader.js", ".loader.js", ".js", ""],
		loaderPostfixes: ["-er-loader", "-loader", ""]
	},
	recursive: false,
	amd: {},
	enhanced: {},
	loader: {}
};

var SELF_REQUIRE = "require = require(" + JSON.stringify(__filename) + ")(module);";

var cache = {};
var sourceCache = {};
var contentCache = {};
var loadingContent = {};
var loadingSource = {};

var natives = process.binding("natives");
function requireNativeModule(name) {
	return require(name);
}
function existsNativeModule(name) {
	return natives.hasOwnProperty(name);
}

/**
 * any require(string module) - sync require
 * void require(array modules, function callback(modules...)) - async require
 * void require(array modules) - async require
 */
function theRequire(parent, context, modules, callback) {
	if(Array.isArray(modules)) {
		theEnsure.call(this, parent, context, modules, function(req) {
			var reqModules = modules.map(function(n) { return req(n) });
			if(callback) callback.apply(null, reqModules);
		});

	} else {
		if(callback) throw new Error("require(string, callback) is not a valid signature. You may want to call require(array, function).");

		// check native module
		if(existsNativeModule(modules)) return requireNativeModule(modules);

		// resolve filename
		var filename = resolve.sync(context, modules, this.options.resolve);

		// check in cache
		if(this.cache[filename]) return this.cache[filename].exports;

		// split loaders from resource
		var filenameWithLoaders = filename;
		var loaders = filename.split(/!/g);
		filename = loaders.pop();

		// check for resource cache
		var content = this.contentCache[filename];
		if(!content) {
			content = this.contentCache[filename] = fs.readFileSync(filename);
		}

		// execute the loaders
		var source = this.sourceCache[filenameWithLoaders];
		if(!source) {
			source =
			this.sourceCache[filenameWithLoaders] =
				execLoaders.sync(
					context,
					filenameWithLoaders,
					loaders, [filename],
					[content],
					{
						loaderType: "loader"
					},
					null,
					this.options
				)[0].toString("utf-8");
		}


		// eval the source code
		var mod = execModule(source, parent, filenameWithLoaders, filename, loaders.length > 0 || this.options.recursive, this.options, this);
		this.cache[filenameWithLoaders] = mod;
		return mod.exports;
	}
}

function theResolve(parent, context, name, callback) {
	if(callback) {
		if(existsNativeModule(name)) return callback(null, name);
		return resolve(context, name, callback);
	} else {
		if(existsNativeModule(name)) return name;
		return resolve.sync(context, name);
	}
}

function theEnsure(parent, context, modules, callback) {
	var options = this.options;
	var reqFn = this.require;
	var cache = this.cache;
	var contentCache = this.contentCache;
	var sourceCache = this.sourceCache;
	var loadingContent = this.loadingContent;
	var loadingSource = this.loadingSource;
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

			if(contentCache[filenameWithLoaders]) return makeSource(null, contentCache[filenameWithLoaders]);
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
				if(err) throw err;
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
								finished(null, (loaders.length > 0 || options.recursive ? SELF_REQUIRE : "") + sources[0].toString("utf-8"));
							else
								throw new Error("Loader result is not a Buffer or string");
						}
					)
				} else
					loadingSource[filenameWithLoaders].push(callback);
			}
		}, function() {
			return callback(reqFn);
		})
	});
}

function theDefine(parent, context, dependencies, fn, arg3) {
	var withName = false;
	if(typeof dependencies == "string") {
		// pop name
		dependencies = fn;
		fn = arg3;
		withName = true;
	}
	if(Array.isArray(dependencies)) {
		theEnsure.call(this, parent, context, dependencies, function(req) {
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

function theContext(parent, context, contextName) {
	return function(name) {
		if(typeof name != "string" || name.substr(0, 2) != "./")
			throw new Error("A function created by require.context must be called with a string beginning with './'");
		return theRequire.call(this, parent, context, contextName + "/" + name);
	}.bind(this);
}

/**
 * create a require function from a filename
 */
function requireFactory(parent, opt, ownCache) {

	if(opt === true) opt = clone(options);

	// get the directory
	var context = path.dirname(parent.filename);

	// make require function
	var reqObj = {
		options: opt || options,
		cache: ownCache ? ownCache.cache || {} : cache,
		sourceCache: ownCache ? ownCache.sourceCache || {} : sourceCache,
		contentCache: ownCache ? ownCache.contentCache || {} : contentCache,
		loadingContent: ownCache ? ownCache.loadingContent || {} : loadingContent,
		loadingSource: ownCache ? ownCache.loadingSource || {} : loadingSource
	};
	var require = reqObj.require = theRequire.bind(reqObj, parent, context);
	require.options = reqObj.options;
	require.cache = reqObj.cache;
	require.sourceCache = reqObj.sourceCache;
	require.contentCache = reqObj.contentCache;
	require.resolve = theResolve.bind(reqObj, parent, context);
	require.ensure = theEnsure.bind(reqObj, parent, context);
	require.context = theContext.bind(reqObj, parent, context);
	require.define = theDefine.bind(reqObj, parent, context);
	require.enhanced = require.options.enhanced;
	require.amd = require.options.amd;
	return require;
};
requireFactory.options = options;
requireFactory.cache = cache;
requireFactory.sourceCache = sourceCache;
requireFactory.contentCache = contentCache;
module.exports = requireFactory;

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
