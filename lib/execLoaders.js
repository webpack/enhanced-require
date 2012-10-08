/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var resolve = require("enhanced-resolve");
var fs = require("fs");
var path = require("path");

/**
 * execLoaders
 * @param context {string}			the context from which this request is coming
 * @param request {string}			the compile request string
 * @param loaders {string[]}		the absolute filenames of the loaders
 * @param filenames {string[]}		the filenames of "contents"
 * @param contents {Buffer[]}		read contents
 * @param loaderContextExtras {object}	more stuff in the loader context
 * @param dependencyInfo {object}	{ cacheable: true, files: [] }
 * @param options {object}			the options of the module system
 * @param callback {function}		(err, arrayOfResultBuffers, allowCaching)
 */
function execLoaders(context, request, loaders, filenames, contents, loaderContextExtras, dependencyInfo, options, sync, callback) {
	var loaderFunctions, cacheable = true;
	if(loaders.length === 0) {
		// if no loaders are used, the file content is the resulting code
		callback(null, contents, true);
	} else {
		// try to load all loaders
		loaderFunctions = [];
		try {
			loaders.forEach(function(loaderFilename) {
				var loader = require(loaderFilename);

				loaderFunctions.push(loader);
			});
		} catch(e) {
			callback(e);
			return;
		}
		// iterate over the loaders, asynchron
		contents.unshift(null);
		nextLoader.apply(null, contents);
	}
	function nextLoader(/* err, paramBuffer1, paramBuffer2, ...*/) {
		var args = Array.prototype.slice.apply(arguments);
		var err = args.shift();
		if(err) {
			// a loader emitted an error
			callback(err);
			return;
		}
		// if loaders are remaining
		if(loaderFunctions.length > 0) {
			var loaderCacheable = false;
			var async = false;
			var done = false;
			try {
				// prepare the loader "this" context
				// see "Loader Specification" in wiki
				function resolveFn(context, path, cb) {
					resolve(context, "!"+path, options.resolve, cb);
				}
				resolveFn.sync = function resolveSync(context, path) {
					return resolve.sync(context, "!"+path, options.resolve);
				}
				var loaderContext = {
					context: context,
					request: request,
					filenames: filenames,
					exec: function(code, filename) {
						var Module = require("module");
						var m = new Module("exec in " + request, module);
						m.filename = filenames[0];
						m.paths = Module._nodeModulePaths(path.dirname(filenames[0]));
						m._compile(code, filename);
						return m.exports;
					},
					resolve: resolveFn,
					cacheable: function(value) {
						if(value === undefined) value = true;
						loaderCacheable = value;
					},
					dependency: function(filename) {
						if(dependencyInfo)
							dependencyInfo.files.push(filename);
					},
					clearDependencies: function(filename) {
						if(dependencyInfo)
							dependencyInfo.files.length = 0;
					},
					async: function() {
						if(sync) return null;
						async = true;
						return loaderContext.callback;
					},
					callback: function(err) {
						async = true;
						if(done) {
							// loader is already "done", so we cannot use the callback function
							// for better debugging we print the error on the console
							if(err && err.stack) console.error(err.stack);
							else if(err) console.error(err);
							else console.error(new Error("loader returned multiple times").stack);
							return;
						}
						done = true;
						contents = [err];
						for(var i = 1; i < arguments.length; i++) {
							var arg = arguments[i];
							if(arg instanceof Buffer)
								contents.push(arg);
							else if(typeof arg === "string")
								contents.push(new Buffer(arg, "utf-8"));
							else
								contents.push(arg);
						}
						loaderFinished.apply(null, arguments);
					},
					loaderIndex: loaderFunctions.length - 1,
					currentLoaders: loaders,
					web: true,
					debug: options.debug,
					minimize: options.minimize,
					values: undefined,
					options: options,
					buffers: args
				};

				// add additional loader context params or functions
				if(options.loader) for(var key in options.loader)
					loaderContext[key] = options.loader[key];

				// add additional loader context params or functions
				if(loaderContextExtras) for(var key in loaderContextExtras)
					loaderContext[key] = loaderContextExtras[key];

				// convert all parameters to strings if they are Buffers
				var params = [];
				args.forEach(function(arg) {
					if(arg instanceof Buffer)
						params.push(arg.toString("utf-8"));
					else
						params.push(arg);
				});

				// exec to loader
				var retVal = loaderFunctions.pop().apply(loaderContext, params);

				// if it isn't asynchron, use the return value
				if(!async) {
					done = true;
					if(retVal instanceof Buffer)
						retVal = retVal;
					else if(typeof retVal === "string")
						retVal = new Buffer(retVal, "utf-8");
					loaderFinished(retVal === undefined ? new Error("loader did not return a value") : null, retVal);
				}

				function loaderFinished() {
					if(!loaderCacheable && dependencyInfo)
						dependencyInfo.cacheable = false;

					nextLoader.apply(null, arguments);
				}
			} catch(e) {
				// ups. loader throwed an exeception
				if(!done) {
					done = true;
					callback(new Error("Loader throwed exeception: " + (typeof e === "object" && e.stack ? e.stack : e)));
				} else {
					// loader is already "done", so we cannot use the callback function
					// for better debugging we print the error on the console
					if(typeof e === "object" && e.stack) console.error(e.stack);
					else console.error(e);
				}
				return;
			}
		} else {
			callback(null, args);
		}
	}
}

function createSyncCallback() {
	var err, result;
	function fn(_err, _result) {
		err = _err;
		result = _result;
	}
	fn.get = function() {
		if(err) throw err;
		return result;
	}
	return fn;
}

module.exports = function(context, request, loaders, filenames, contents, loaderContextExtras, dependencyInfo, options, callback) {
	return execLoaders(context, request, loaders, filenames, contents, loaderContextExtras, dependencyInfo, options, false, callback);
}
module.exports.sync = function(context, request, loaders, filenames, contents, loaderContextExtras, dependencyInfo, options) {
	var callback = createSyncCallback();
	execLoaders(context, request, loaders, filenames, contents, loaderContextExtras, dependencyInfo, options, true, callback);
	return callback.get();
}