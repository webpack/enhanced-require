var should = require("should");
var path = require("path");
var reqFactory = require("../");

describe("amd", function() {
	var req = reqFactory(module);
	if(typeof define != "function") var define = req.define;

	beforeEach(function() {
		function clean(obj) {
			for(var name in obj)
				delete obj[name];
		}
		clean(req.cache);
		clean(req.preCache);
		req.__root.fileSystem.purge();
		req.__root.syncFileSystem.purge();
	});

	it("should require a module", function(done) {
		req(["./fixtures/file"], function(file) {
			should.exist(file);
			file.should.be.eql({value: "file"});
			file.should.be.equal(req("./fixtures/file.js"));
			done();
		});
	});

	it("should require async", function(done) {
		var sync = false;
		req(["./fixtures/file"], function(file) {
			sync = true;
			done();
		});
		if(sync) throw new Error("require is not async");
	});

	it("should define a commonjs module", function() {
		var sync = false;
		define(function(require, exports, mod) {
			should.exist(require);
			should.exist(exports);
			should.exist(mod);
			require.should.be.a("function");
			exports.should.be.a("object");
			exports.should.be.equal(module.exports);
			mod.should.be.equal(module);
			sync = true;
		});
		if(!sync) throw new Error("define is not sync");
	});

	it("should define a module (no deps)", function(done) {
		var sync = false;
		define("amd", function() {
			sync = true;
			var obj = {adfjklg:1};
			process.nextTick(function() {
				module.exports.should.be.equal(obj);
				done();
			});
			return obj;
		});
		if(!sync) throw new Error("define is not sync");
	});

	it("should define a module (no name)", function(done) {
		var sync = false;
		define(["./fixtures/file", "./fixtures/outer.js"], function(file, outer) {
			sync = true;
			file.should.be.eql({value: "file"});
			outer.should.be.eql({inner: "inner"});
			var obj = {lhxwer:2};
			process.nextTick(function() {
				module.exports.should.be.equal(obj);
				done();
			});
			return obj;
		});
		if(sync) throw new Error("define is not async");
	});

	it("should define a module", function(done) {
		var sync = false;
		define("amd", ["./fixtures/file", "./fixtures/outer.js"], function(file, outer) {
			sync = true;
			file.should.be.eql({value: "file"});
			outer.should.be.eql({inner: "inner"});
			var obj = {ovhweghr:3};
			process.nextTick(function() {
				module.exports.should.be.equal(obj);
				done();
			});
			return obj;
		});
		if(sync) throw new Error("define is not async");
	});

	it("should define a module with require and exports dependencies", function(done) {
		var sync = false;
		define("amd", ["./fixtures/file", "./fixtures/outer.js", "require", "exports"], function(file, outer, req2, exports) {
			sync = true;
			file.should.be.eql({value: "file"});
			outer.should.be.eql({inner: "inner"});
			req2.should.be.equal(req);
			exports.ovhweghr = 3;
			process.nextTick(function() {
				module.exports.should.be.equal(exports);
				module.exports.ovhweghr.should.be.equal(3);
				done();
			});
		});
		if(sync) throw new Error("define is not async");
	});

});