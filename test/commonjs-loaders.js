var should = require("should");
var path = require("path");
var reqFactory = require("../");

describe("commonjs-loaders", function() {
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
	
	it("should execute a loader", function() {
		var outer = req("./fixtures/outer");
		var outerLoaded = req("./fixtures/loader!./fixtures/outer");
		should.exist(outerLoaded);
		outerLoaded.should.be.not.equal(outer);
		outerLoaded.should.have.property("inner").be.eql("inner");
		outerLoaded.should.have.property("loader").be.a("object");
		outerLoaded.should.have.property("async").be.eql(false);
		outerLoaded.loader.should.have.property("request").be.eql(req.resolve("./fixtures/loader!./fixtures/outer"));
		outerLoaded.loader.should.have.property("context").be.eql(__dirname);
		outerLoaded.loader.should.have.property("filenames").be.eql([req.resolve("./fixtures/outer")]);
	});
	
});