/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("module");
var vm = require("vm");
var path = require("path");
var runInThisContext = require("vm").runInThisContext;

function stripBOM(content) {
	// Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
	// because the buffer-to-string conversion in `fs.readFileSync()`
	// translates it to FEFF, the UTF-16 BOM.
	if (content.charCodeAt(0) === 0xFEFF) {
		content = content.slice(1);
	}
	return content;
}

var wrapper = ["(function (exports, require, module, __filename, __dirname) {", "})"];

module.exports = function(code, parent, request, filename, enhancedRequire, options, reqObj) {
	if(enhancedRequire) {
		var m = {
			id: request,
			parent: parent,
			filename: filename,
			loaded: false,
			children: [],
			exports: {}
		};
		var wrappedCode = wrapper[0] + stripBOM(code) + wrapper[1];
		var wrappedFunction = runInThisContext(wrappedCode, request, request == filename);
		var req = require("./require")(m, options, reqObj);
		wrappedFunction.call(m.exports, m.exports, req, m, filename, path.dirname(filename));
		m.loaded = true;
		return m;
	} else {
		var m = new Module(request, parent);
		m.filename = filename;
		if(options && options.paths)
			m.paths = options.paths;
		else
			m.paths = Module._nodeModulePaths(path.dirname(filename));
		m._compile(code, filename);
		return m;
	}
}