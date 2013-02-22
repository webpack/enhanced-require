var runInThisContext = require("vm").runInThisContext;
var path = require("path");
var NormalModuleMixin = require("webpack-core/lib/NormalModuleMixin");

function stripBOM(content) {
	// Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
	// because the buffer-to-string conversion in `fs.readFileSync()`
	// translates it to FEFF, the UTF-16 BOM.
	if (content.charCodeAt(0) === 0xFEFF) {
		content = content.slice(1);
	}
	return content;
}

function Module(request, loaders, resource, parent, requireRoot) {
	NormalModuleMixin.call(this, loaders, resource);
	this.id = request;
	this.parent = parent;
	this.children = [];
	this.parents = [];
	this.loaded = false;
	this.exports = {};
	this.filename = this.splitQuery(this.resource)[0];

	this.require = require("./require").factory(this, requireRoot);
}

module.exports = Module;

Module.prototype = Object.create(NormalModuleMixin.prototype);
Module.prototype.build = function(options, context, resolver, fs, callback) {
	this.buildTimestamp = new Date().getTime();
	return this.doBuild(options, false, resolver, fs, callback);
};

Module.prototype.buildSync = function(options, context, resolver, fs) {
	this.buildTimestamp = new Date().getTime();
	var e, d = false;
	return this.doBuild(options, true, resolver, fs, function(err) {
		e = err;
		d = true;
	});
	if(!d) throw new Error("build is not synchron");
	if(e) throw e;
};

Module.prototype._compile = function() {
	if(this.error) throw this.error;
	if(!this._source) throw new Error("No source availible");
	var code = this._source.source().replace(/^\#\!.*/, '');
	var wrappedCode = "(function (exports, require, define, module, __filename, __dirname) {" + stripBOM(code) + "\n})";
	var wrappedFunction = runInThisContext(wrappedCode, this.id, this.id == this.filename);
	wrappedFunction.call(
		null,
		this.exports,
		this.require,
		this.require.define,
		this,
		this.filename,
		path.dirname(this.filename)
	);
	this.loaded = true;
};

Module.prototype.fillLoaderContext = function(loaderContext, options, sync) {
	loaderContext.enhancedRequire = true;
	loaderContext.target = "node";
	if(sync) {
		loaderContext.async = function() { return null; }
	}
};