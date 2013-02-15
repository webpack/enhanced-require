/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OptionsDefaulter = require("webpack-core/lib/OptionsDefaulter");

function EROptionsDefaulter(fallbackContext) {
	OptionsDefaulter.call(this);
	this.set("debug", false);

	this.set("context", fallbackContext);
	this.set("watchDelay", 200);
	this.set("hot", false);
	this.set("amd", {});
	this.set("enhanced", {});
	this.set("module", {});
	this.set("resolve", {});
	this.set("resolveLoader", {});

	this.set("resolve.modulesDirectories", ["node_modules"]);
	this.set("resolveLoader.modulesDirectories", ["node_loaders", "node_modules"]);

	this.set("resolveLoader.moduleTemplates", ["*-loader", "*"]);

	this.set("resolve.alias", {});
	this.set("resolveLoader.alias", {});

	this.set("resolve.extensions", ["", ".js", ".node"]);
	this.set("resolveLoader.extensions", [".loader.js", "", ".js"]);

	this.set("resolve.packageMains", ["main"]);
	this.set("resolveLoader.packageMains", ["loader", "main"]);
}
module.exports = EROptionsDefaulter;

EROptionsDefaulter.prototype = Object.create(OptionsDefaulter.prototype);
