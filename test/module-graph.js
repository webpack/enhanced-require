var should = require("should");
var path = require("path");
var reqFactory = require("../");

describe("module-graph", function() {
	var req = reqFactory(module);

	var graphModule = req("./fixtures/graph");

	it("should have correct ids", function() {
		graphModule.module.id.should.be.eql(req.resolve("./fixtures/graph"));
		graphModule.a.id.should.be.eql(req.resolve("./fixtures/graph/a"));
		graphModule.b.id.should.be.eql(req.resolve("./fixtures/graph/b"));
	});

	it("should have no parents in initial module", function() {
		should.exist(graphModule.module.parents);
		graphModule.module.parents.should.be.eql([__filename]);
	});

	it("should have two the children", function() {
		should.exist(graphModule.module.children);
		graphModule.module.children.should.be.eql([graphModule.a, graphModule.b]);
	});

	it("should have one parent in submodule a", function() {
		graphModule.a.parents.should.be.eql([req.resolve("./fixtures/graph")]);
	});

	it("should have two parents in submodule b", function() {
		graphModule.b.parents.should.be.eql([req.resolve("./fixtures/graph/a"), req.resolve("./fixtures/graph")]);
	});

	it("should have module b as children of a", function() {
		graphModule.a.children.should.be.eql([graphModule.b]);
	});

});