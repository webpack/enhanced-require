/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function stripBOM(content) {
	// Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
	// because the buffer-to-string conversion in `fs.readFileSync()`
	// translates it to FEFF, the UTF-16 BOM.
	if (content.charCodeAt(0) === 0xFEFF) {
		content = content.slice(1);
	}
	return content;
}

module.exports = function(code, parent, request, filename, enhancedRequire, options, requireRoot) {
	var m;
	if(enhancedRequire) {
		var EnhancedModule = require("./Module");
		m = new EnhancedModule(request, parent, requireRoot);
	} else {
		var NodeModule = require("module");
		m = new NodeModule(request, parent);
		m.paths = NodeModule._nodeModulePaths(path.dirname(filename));
	}
	m.filename = filename;
	var exec = function() {
		m._compile(code, filename);
		return m.exports;
	}
	exec.module = m;
	return exec;
}