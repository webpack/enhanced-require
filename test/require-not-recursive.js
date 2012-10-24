var should = require("should");
var reqFactory = require("../");

describe("require-not-recusive", function() {
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

	it("should not enhance submodules", function() {
		var a = req("./fixtures/recursive1");
		should.exist(a);
		a.should.not.have.property("amd");
	});

});