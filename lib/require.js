/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var path = require("path");
var clone = require("clone");


/**
 * create a require function from a filename
 */
function requireFactory(parent, requireRoot) {

	var requireContext = requireRoot.createContext(parent);
	if(requireContext.require.hot && requireRoot.main !== parent) {
		parent.hot = requireContext.require.hot;
	}
	return requireContext.require;
};

exports = module.exports = function(parent, options) {

	// Default options
	options = options || {};
	if(!options.resolve) options.resolve = {};
	if(!options.resolve.loaders) options.resolve.loaders = [];
	options.resolve.loaders.push(
		{test: /\.node$/, loader: path.join(__dirname, "node.loader.js")},
		{test: /\.coffee$/, loader: "coffee"},
		{test: /\.json$/, loader: "json"},
		{test: /\.jade$/, loader: "jade"}
	);
	if(!options.resolve.extensions)
		options.resolve.extensions = ["", ".node", ".er.js", ".js"];
	if(!options.resolve.loaderExtensions)
		options.resolve.loaderExtensions = [".er-loader.js", ".loader.js", ".js", ""];
	if(!options.resolve.loaderPostfixes)
		options.resolve.loaderPostfixes = ["-er-loader", "-loader", ""];
	if(!options.amd) options.amd = {};
	if(!options.enhanced) options.enhanced = {};
	if(!options.loader) options.loader = {};
	if(options.watchDelay === undefined) options.watchDelay = 400;
	if(options.recursive === undefined) options.recursive = options.hot;

	if(options.hot && !options.recursive) throw new Error("hot option depends on recursive option");

	var requireRoot = new (options.hot ? require("./HotRequireRoot") : require("./RequireRoot"))(parent, options);

	return requireFactory(parent, requireRoot);
};
exports.factory = requireFactory;
