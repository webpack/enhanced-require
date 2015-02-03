var runInThisContext = require("vm").runInThisContext;
var path = require("path");

var wrapper = ["(function (exports, require, define, module, __filename, __dirname) {", "})"];

function stripBOM(content) {
	// Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
	// because the buffer-to-string conversion in `fs.readFileSync()`
	// translates it to FEFF, the UTF-16 BOM.
	if (content.charCodeAt(0) === 0xFEFF) {
		content = content.slice(1);
	}
	return content;
}

function Module(id, parent, requireRoot) {
	this.id = id;
	this.parent = parent;
	this.children = [];
	this.loaded = false;
	this.exports = {};
	this.paths = [];

	this.require = require("./require").factory(this, requireRoot);
}

module.exports = Module;

Module.prototype._compile = function(code) {
	var wrappedCode = wrapper[0] + stripBOM(code) + wrapper[1];
	var wrappedFunction = runInThisContext(wrappedCode, this.id, this.id == this.filename);
	wrappedFunction.call(
		this.exports,
		this.exports,
		this.require,
		this.require.define,
		this,
		this.filename,
		path.dirname(this.filename)
	);
	this.loaded = true;
}