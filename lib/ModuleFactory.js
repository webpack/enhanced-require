/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");

var Module = require("./Module");
var LoadersList = require("webpack-core/lib/LoadersList");

function ModuleFactory(context, resolvers, options) {
	this.loaders = new LoadersList(options.loaders);
	// this.preLoaders = new LoadersList(options.preLoaders);
	// this.postLoaders = new LoadersList(options.postLoaders);
	this.resolvers = resolvers;
	this.context = context || "";
}

module.exports = ModuleFactory;
ModuleFactory.prototype.create = function(context, request, parent, root, callback) {
	context = context || this.context;
	var noAutoLoaders = /^!/.test(request);
	var elements = request.replace(/^!+/, "").replace(/!!+/g, "!").split("!");
	var resource = elements.pop();
	this.resolveRequestArray(context, elements, this.resolvers.loaderSync, function(err, loaders) {
		if(err) return callback(err);
		if(resource != "" && resource[0] != "?") {
			this.resolvers.normalSync.resolve(context, resource, function(err, res) {
				if(err) return callback(err);
				resource = res;
				goon.call(this);
			}.bind(this));
		} else goon.call(this);
		function goon() {
			if(!noAutoLoaders)
				loaders = loaders.concat(this.resolveRequestArraySync(context, this.loaders.match(resource), this.resolvers.loaderSync));
			request = loaders.concat([resource]).join("!");
			return callback(null, new Module(request, loaders, resource, parent, root));
		}
	}.bind(this));
};

ModuleFactory.prototype.createSync = function(context, request, parent, root) {
	context = context || this.context;
	var noAutoLoaders = /^!/.test(request);
	// var noPrePostAutoLoaders = /^!!/.test(request);
	var elements = request.replace(/^!+/, "").replace(/!!+/g, "!").split("!");
	var resource = elements.pop();
	var loaders = this.resolveRequestArraySync(context, elements, this.resolvers.loaderSync);
	if(resource != "" && resource[0] != "?")
		resource = this.resolvers.normalSync.resolveSync(context, resource);
	if(!noAutoLoaders)
		loaders = loaders.concat(this.resolveRequestArraySync(context, this.loaders.match(resource), this.resolvers.loaderSync));
	request = loaders.concat([resource]).join("!");
	return new Module(request, loaders, resource, parent, root);
};

ModuleFactory.prototype.resolveRequestArraySync = function resolveRequestArraySync(context, array, resolver) {
	if(array.length === 0) return [];
	return array.map(function(item) {
		if(item == "" || item[0] == "?")
			return item;
		return resolver.resolveSync(context, item);
	});
};

ModuleFactory.prototype.resolveRequestArray = function resolveRequestArray(context, array, resolver, callback) {
	if(array.length === 0) return callback(null, []);
	async.map(array, function(item, callback) {
		if(item == "" || item[0] == "?")
			return callback(null, item);
		resolver.resolve(context, item, callback);
	}, callback);
};