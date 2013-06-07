var path = require("path");
var clone = require("clone");
var hasOwnProperty = Object.prototype.hasOwnProperty;


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
	if(typeof parent === "string") {
		this.context = parent;
	} else {
		this.module = parent;
		if(parent.filename) {
			this.context = path.dirname(parent.filename);
		} else if(parent.resource && parent.splitQuery && parent.resource[0] != "?") {
			this.context = path.dirname(parent.splitQuery(parent.resource)[0]);
		} else if(typeof root.main === "string") {
			this.context = root.main;
		} else if(root.main && root.main.filename) {
			this.context = path.dirname(root.main.filename);
		} else {
			this.context = "";
		}
	}
}

module.exports = RequireContext;

RequireContext.prototype.createRequire = function createRequire() {
	var require = this.require = this.theRequire.bind(this);
	require.options = this.root.options;
	require.cache = this.root.cache;
	require.preCache = this.root.preCache;
	require.enhanced = this.root.options.enhanced;
	require.amd = this.root.options.amd;

	require.resolve = this.theResolve.bind(this);
	require.ensure = this.theEnsure.bind(this);
	require.context = this.theContext.bind(this);
	require.define = this.theDefine.bind(this);

	require.__root = this.root;
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

		// create module by resolving
		var module = this.root.moduleFactory.createSync(context, modules, parent, this.root);

		// check in cache
		var cache = this.root.cache;
		if(cache[module.id]) {
			var m = cache[module.id];
			if(!m.substitution && parent) {
				m.parents = addToSet(m.parents, parent.id);
				parent.children = addToSet(parent.children, m);
			}
			return m.exports;
		}

		// check for substitution
		if(hasOwnProperty.call(this.root.substitutions, module.id)) {
			module = {
				id: module.id,
				substitution: true,
				exports: this.root.substitutions[module.id]
			};
			cache[module.id] = module;
			return module.exports;
		}
		if(hasOwnProperty.call(this.root.substitutionFactories, module.id)) {
			module = {
				id: module.id,
				substitution: true,
				exports: {}
			};
			cache[module.id] = module;
			module.exports = this.root.substitutionFactories[module.id](this.root.require);
			return module.exports;
		}

		var preCache = this.root.preCache;
		if(preCache[module.id]) {
			module = preCache[module.id];
		} else {
			// build module
			module.buildSync(this.root.options, this, this.root.resolvers.normalSync, this.root.syncFileSystem);
		}

		// add to cache
		cache[module.id] = module;

		// set dependencies
		this.root.setDependencies(module.id, module.fileDependencies);

		// make dependency graph
		if(parent) {
			module.parents = [parent.id];
			parent.children.push(module);
		}

		// execute
		module._compile();
		return module.exports;
	}
}

RequireContext.prototype.theResolve = function theResolve(name, callback) {
	if(callback) {
		if(existsNativeModule(name)) return callback(null, name);
		this.root.moduleFactory.create(this.context, name, null, this.root, function(err, module) {
			if(err) return callback(err);
			return callback(null, module.id);
		});
	} else {
		if(existsNativeModule(name)) return name;
		return this.root.moduleFactory.createSync(this.context, name, null, this.root).id;
	}
}

RequireContext.prototype.theEnsure = function theEnsure(modules, callback) {
	var context = this.context;
	var options = this.root.options;
	var cache = this.root.cache;
	var reqFn = this.require;
	var preCache = this.root.preCache;
	var root = this.root;
	mapAsync(modules, function(name, callback) {
		if(typeof name != "string") return callback(null, name);
		if(existsNativeModule(name)) return callback(null, name);
		this.root.moduleFactory.create(context, name, null, this.root, callback);
	}.bind(this), function(err, resolvedModules) {
		if(err) return callback(reqFn, err);
		mapAsync(resolvedModules, function(module, callback) {
			if(cache[module.id]) return callback();
			if(preCache[module.id]) return callback();
			if(hasOwnProperty.call(root.substitutions, module.id)) return callback();
			if(hasOwnProperty.call(root.substitutionFactories, module.id)) return callback();

			module.build(this.root.options, this, this.root.resolvers.normal, this.root.fileSystem, function(err) {
				if(err) {
					console.log(err);
					return callback();
				}
				if(!preCache[module.id])
					preCache[module.id] = module;
				return callback();
			});
		}.bind(this), function(err) {
			return callback(reqFn, err);
		})
	}.bind(this));
}

RequireContext.prototype.theDefine = function theDefine(dependencies, fn, arg3) {
	var parent = this.module;
	var reqFn = this.require;
	var withName = false;
	if(typeof dependencies == "string") {
		// pop name
		dependencies = fn;
		fn = arg3;
		withName = true;
	}
	if(Array.isArray(dependencies)) {
		dependencies = dependencies.map(function(dep) {
			if(dep == "require") return reqFn;
			if(dep == "exports") return parent.exports;
			return dep;
		});
		this.theEnsure(dependencies.filter(function(name) {
			return typeof name == "string";
		}), function(req, err) {
			var exp = fn.apply(null, dependencies.map(function(n) {
				if(typeof n != "string") return n;
				return req(n);
			}));
			if(exp !== undefined) parent.exports = exp;
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
			fn(reqFn, parent.exports, parent);
		else
			parent.exports = fn;
	}
}

RequireContext.prototype.theContext = function theContext(contextName, recursive, regExp) {
	var contextFn = function(name) {
		if(typeof name != "string" || name.substr(0, 2) != "./")
			throw new Error("A function created by require.context must be called with a string beginning with './'");
		if(regExp && !regExp.test(name))
			throw new Error("Request '" + name + "' do not match the provided regExp " + regExp.toString() + " on require.context");
		if(recursive === false && name.lastIndexOf("/") > 1)
			throw new Error("Request '" + name + "' want to access a file outside the directory, this is not allowed by recursive = false");
		return this.theRequire(contextName + "/" + name);
	}.bind(this);
	contextFn.keys = function() {
		var elements = contextName.split("!");
		var resource = elements.pop();
		var request = this.root.resolvers.contextSync.resolveSync(this.context, resource);
		var stack = [request];
		var requests = [];
		var fs = this.root.syncFileSystem;
		var readdirSync = function(path) {
			var r;
			fs.readdir(path, function(err, result) {
				if(err) throw err;
				r = result;
			});
			return r;
		}
		var statSync = function(path) {
			var r;
			fs.stat(path, function(err, result) {
				if(err) throw err;
				r = result;
			});
			return r;
		}
		while(stack.length > 0) {
			var dir = stack.pop();
			var files = readdirSync(dir);
			files = files.map(function(file) {
				var p = path.join(dir, file);
				return {
					path: p,
					stat: statSync(p)
				}
			});
			if(recursive !== false) {
				stack = stack.concat(files.filter(function(obj) {
					return obj.stat.isDirectory()
				}).map(function(obj) {
					return obj.path;
				}));
			}
			requests = requests.concat(files.filter(function(obj) {
				return obj.stat.isFile()
			}).map(function(obj) {
				return obj.path;
			}));
		}
		requests = requests.map(function(req) {
			return this.root.options.resolve.extensions.filter(function(ext) {
				var l = req.length;
				return (l > ext.length && req.substr(l - ext.length, l) == ext);
			}).map(function(ext) {
				var l = req.length;
				return req.substr(0, l - ext.length);
			});
		}, this).reduce(function(arr, part) {
			return arr.concat(part);
		}, []).filter(function(req) {
			return req.indexOf(request) == 0;
		}).map(function(req) {
			return "." + req.substr(request.length).replace(/\\/g, "/");
		}).filter(function(req) {
			return !regExp || regExp.test(req);
		});
		return requests.sort();
	}.bind(this);
	return contextFn;
}


