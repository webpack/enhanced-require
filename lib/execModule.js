/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("module");
var vm = require("vm");
var path = require("path");

module.exports = function(code, parent, request, filename, options) {
	options = options || {};
	var m = new Module(request, parent);
	m.filename = filename;
	if(options.paths)
		m.paths = options.paths;
	else
		m.paths = Module._nodeModulePaths(path.dirname(filename));
	m._compile(code, filename);
	return m;
}