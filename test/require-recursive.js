var should = require("should");
var reqFactory = require("../");

describe("require-recusive", function() {
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

	it("should handle circular requires", function() {
		var c = req("./fixtures/circular1");
		should.exist(c);
		c.should.be.eql({ two: { one: 1 } });
	});

});