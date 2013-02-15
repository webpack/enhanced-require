var should = require("should");
var path = require("path");
var reqFactory = require("../");

describe("require-context", function() {
	var req = reqFactory(module);
	var context = req.context("./fixtures")

	beforeEach(function() {
		function clean(obj) {
			for(var name in obj)
				delete obj[name];
		}
		clean(req.cache);
		clean(req.contentCache);
		clean(req.sourceCache);
	});

	it("should be able to require a file without extension", function() {
		var a = context("./file");
		should.exist(a);
		a.should.be.eql({value: "file"});
	});

	it("should be able to require a file with extension", function() {
		var a = context("./file.js");
		should.exist(a);
		a.should.be.eql({value: "file"});
	});

	it("should be able to require a file in a subdirectory", function() {
		var a = context("./directory/file2.js");
		should.exist(a);
		a.should.be.eql({value: "file2"});
	});

	it("should throw an exception if the module does not exists", function() {
		(function() {
			context("./notExists.js");
		}).should.throw(/notExists\.js/);
	});

	it("should be able to use a loader in require.context", function() {
		var context = req.context("raw!./fixtures");
		var a = context("./directory/file2");
		a.should.be.eql("module.exports = {value: \"file2\"};");
	});

	it("should be able to use context.keys()", function() {
		var context = req.context("./fixtures/graph");
		should.exist(context.keys);
		context.keys.should.be.a("function");
		var keys = context.keys();
		should.exist(keys);
		keys.should.be.eql([
			"./a",
			"./a.js",
			"./b",
			"./b.js"
		]);
	});

	it("should be able to use context.keys() with loader", function() {
		var context = req.context("raw!./fixtures/graph");
		should.exist(context.keys);
		context.keys.should.be.a("function");
		var keys = context.keys();
		should.exist(keys);
		keys.should.be.eql([
			"./a",
			"./a.js",
			"./b",
			"./b.js"
		]);
	});

	it("should be able to use context.keys() with RegExp", function() {
		var context = req.context("./fixtures/graph", true, /^\.\/a/);
		should.exist(context.keys);
		context.keys.should.be.a("function");
		var keys = context.keys();
		should.exist(keys);
		keys.should.be.eql([
			"./a",
			"./a.js"
		]);
	});

	it("should be able to use context.keys() with RegExp, recursive = true", function() {
		var context = req.context("./fixtures", true, /^\.\/graph/);
		should.exist(context.keys);
		context.keys.should.be.a("function");
		var keys = context.keys();
		should.exist(keys);
		keys.should.be.eql([
			"./graph",
			"./graph.js",
			"./graph/a",
			"./graph/a.js",
			"./graph/b",
			"./graph/b.js"
		]);
	});

	it("should be able to use context.keys() with RegExp, recursive = false", function() {
		var context = req.context("./fixtures", false, /^\.\/graph/);
		should.exist(context.keys);
		context.keys.should.be.a("function");
		var keys = context.keys();
		should.exist(keys);
		keys.should.be.eql([
			"./graph",
			"./graph.js"
		]);
	});

});