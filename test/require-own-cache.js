var should = require("should");
var reqFactory = require("../");

describe("require-own-cache", function() {

	it("should have independend caches", function(done) {
		var req1 = reqFactory(module);
		var req2 = reqFactory(module);
		var req3 = reqFactory(module);

		var m1 = req1("./fixtures/random");
		var m1b = req1("./fixtures/random");
		var m2 = req2("./fixtures/random");
		var m2b = req2("./fixtures/random");
		var m3 = req3("./fixtures/random");
		var m3b = req3("./fixtures/random");

		check();

		var count = 3;
		req1(["./fixtures/random", "./fixtures/random"], function(p1, p1b) {
			m1 = p1;
			m1b = p1b;
			if(--count == 0) next();
		});
		req2(["./fixtures/random", "./fixtures/random"], function(p2, p2b) {
			m2 = p2;
			m2b = p2b;
			if(--count == 0) next();
		});
		req3(["./fixtures/random", "./fixtures/random"], function(p3, p3b) {
			m3 = p3;
			m3b = p3b;
			if(--count == 0) next();
		});

		function next() {
			check();
			done();
		}

		function check() {
			m1.should.not.be.eql(m2);
			m1.should.not.be.eql(m3);
			m2.should.not.be.eql(m3);

			m1.should.be.eql(m1b);
			m2.should.be.eql(m2b);
			m3.should.be.eql(m3b);
		}
	});

	it("should be able to combine recursive with a own cache", function() {
		var req = reqFactory(module);

		var a = req("./fixtures/recursiveRandom2");
		var b = req("./fixtures/recursiveRandom");
		var c = req("./fixtures/random");

		a.should.be.eql(b);
		a.should.be.eql(c);
	});

});