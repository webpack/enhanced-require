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
		}).should.throw(/Module ".*?" not found/);
	});
	
});