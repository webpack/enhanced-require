/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var path = require("path");
var clone = require("clone");

var EROptionsDefaulter = require("./EROptionsDefaulter");

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

	var context = "";
	if(typeof parent === "string") context = parent
	else if(parent.context) context = parent.context;
	else if(parent.filename) context = path.dirname(parent.filename);
	new EROptionsDefaulter(context).process(options)

	var requireRoot = new (options.hot ? require("./HotRequireRoot") : require("./RequireRoot"))(parent, options);

	var requireFn = requireFactory(parent, requireRoot);
	requireRoot.require = requireFn;

	var substitutions = options.substitutions;
	requireRoot.substitutions = {};
	for(var key in substitutions) {
		requireRoot.substitutions[requireFn.resolve(key)] = substitutions[key];
	}

	var substitutionFactories = options.substitutionFactories;
	requireRoot.substitutionFactories = {};
	for(var key in substitutionFactories) {
		requireRoot.substitutionFactories[requireFn.resolve(key)] = substitutionFactories[key];
	}

	return requireFn;
};
exports.factory = requireFactory;
