var should = require("should");
var reqFactory = require("../");

describe("require-recusive", function() {
	var req = reqFactory(module);

	before(function() {
		reqFactory.options.recursive = true;
	});

	after(function() {
		reqFactory.options.recursive = false;
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

	it("should enhance submodules", function() {
		var a = req("./fixtures/recursive1");
		should.exist(a);
		a.should.have.property("amd").be.equal(req.amd);
	});

});