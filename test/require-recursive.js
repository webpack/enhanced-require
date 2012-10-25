var should = require("should");
var reqFactory = require("../");

describe("require-recusive", function() {
	var req = reqFactory(module, {
		recursive: true
	});

	beforeEach(function() {
		function clean(obj) {
			for(var name in obj)
				delete obj[name];
		}
		clean(req.cache);
		clean(req.contentCache);
		clean(req.sourceCache);
	});

	it("should enhance submodules (one level)", function() {
		var a = req("./fixtures/recursive2");
		should.exist(a);
		a.should.have.property("amd").be.equal(req.amd);
		a.should.have.property("enhanced").be.equal(req.enhanced);
	});

	it("should enhance submodules (two levels)", function() {
		var a = req("./fixtures/recursive3");
		should.exist(a);
		a.should.have.property("amd").be.equal(req.amd);
		a.should.have.property("enhanced").be.equal(req.enhanced);
	});

});