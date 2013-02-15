var should = require("should");
var path = require("path");
var reqFactory = require("../");

describe("commonjs", function() {
	var req = reqFactory(module);

	beforeEach(function() {
		function clean(obj) {
			for(var name in obj)
				delete obj[name];
		}
		clean(req.cache);
		clean(req.contentCache);
		clean(req.sourceCache);
	});

	it("should form a require function", function() {

		should.exist(req);
		req.should.be.a("function");
		req.should.have.property("enhanced").be.a("object");
		req.should.have.property("options").be.a("object");
		req.should.have.property("ensure").be.a("function");
		req.should.have.property("resolve").be.a("function");
		req.should.have.property("cache").be.a("object");
		req.should.have.property("preCache").be.a("object");

	});

	it("should require a file sync", function() {
		var file = req("./fixtures/file.js");
		should.exist(file);
		file.should.be.eql({value: "file"});
		file.should.be.equal(req("./fixtures/file"));
	});

	it("should require.resolve a file sync", function() {
		var file = req.resolve("./fixtures/file.js");
		should.exist(file);
		file.should.be.eql(path.join(__dirname, "fixtures", "file.js"));
		file.should.be.equal(req.resolve("./fixtures/file"));
	});

	it("should let the user clean the cache", function() {
		var fileId = req.resolve("./fixtures/file");
		var fileA = req(fileId);
		delete req.cache[fileId];
		var fileB = req(fileId);
		fileA.should.not.be.equal(fileB);
		fileA.should.be.eql(fileB);
	});

	it("should be able to require in a required module", function() {
		var outer = req("./fixtures/outer");
		outer.should.be.eql({inner: "inner"});
	});

	it("should fill free vars in required module", function() {
		var freeVars = req("./fixtures/freeVars");
		freeVars.should.have.property("filename")
			.be.eql(path.join(__dirname, "fixtures", "freeVars.js"));
		freeVars.should.have.property("dirname")
			.be.eql(path.join(__dirname, "fixtures"));
		freeVars.should.have.property("require")
			.be.a("function");
		// freeVars.should.have.property("define")
			// .be.a("function");
		freeVars.should.have.property("module")
			.be.a("object").and.have.property("exports").be.equal(freeVars.exports);

	});

	it("should handle native modules", function() {
		var fs = req("fs");
		should.exist(fs);
		fs.should.be.equal(require("fs"));
	});

});