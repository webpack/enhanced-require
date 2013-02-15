var should = require("should");
var reqFactory = require("../");

describe("require-substitutions", function() {
	var req = reqFactory(module, {
		substitutions: {
			"./fixtures/recursive1": "substitution1",
			"./fixtures/random": 0
		},
		substitutionFactories: {
			"./fixtures/inner": function(require) {
				return "extra " + require("./fixtures/inner?query");
			},
			"./fixtures/file": function() {
				return {};
			}
		}
	});
	var innerValue = false;

	beforeEach(function() {
		function clean(obj) {
			for(var name in obj)
				delete obj[name];
		}
		clean(req.cache);
		clean(req.contentCache);
		clean(req.sourceCache);
	});

	it("should load a substitution (zero level)", function() {
		var a = req("./fixtures/recursive1");
		should.exist(a);
		a.should.be.eql("substitution1");
	});

	it("should load a substitution (one level)", function() {
		var a = req("./fixtures/recursive2");
		should.exist(a);
		a.should.be.eql("substitution1");
	});

	it("should load a substitution (two level)", function() {
		var a = req("./fixtures/recursive3");
		should.exist(a);
		a.should.be.eql("substitution1");
	});

	it("should load a substitution also if '0'", function() {
		var a = req("./fixtures/random");
		should.exist(a);
		a.should.be.eql(0);
	});

	it("should load a substitution factory (zero level)", function() {
		var a = req("./fixtures/inner");
		should.exist(a);
		a.should.be.eql("extra inner");
	});

	it("should load a substitution factory (one level)", function() {
		var a = req("./fixtures/outer");
		should.exist(a);
		a.should.be.eql({inner: "extra inner"});
	});

	it("should cache a substitution", function() {
		var a = req("./fixtures/file");
		var b = req("./fixtures/file");
		should.exist(a);
		should.exist(b);
		a.should.be.a("object");
		b.should.be.a("object");
		a.should.be.equal(b);
	});

	it("should load a substitution with AMD require", function(done) {
		req(["./fixtures/recursive1"], function(a) {
			should.exist(a);
			a.should.be.eql("substitution1");
			done();
		});
	});

	it("should load a substitution factory with AMD require", function(done) {
		req(["./fixtures/inner"], function(a) {
			should.exist(a);
			a.should.be.eql("extra inner");
			done();
		});
	});

	it("should load a substitution with AMD define", function(done) {
		req.define("test", ["./fixtures/recursive1"], function(a) {
			should.exist(a);
			a.should.be.eql("substitution1");
			done();
		});
	});

	it("should load a substitution with require.ensure", function(done) {
		req.ensure(["./fixtures/recursive1"], function(req) {
			var a = req("./fixtures/recursive1");
			should.exist(a);
			a.should.be.eql("substitution1");
			done();
		});
	});

	it("should load a substitution with require.context", function() {
		var context = req.context("./fixtures");
		var a = context("./recursive1");
		should.exist(a);
		a.should.be.eql("substitution1");
	});

});