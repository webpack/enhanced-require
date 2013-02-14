var should = require("should");
var path = require("path");
var reqFactory = require("../");

describe("modules-async", function() {
	var req = reqFactory(module);

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

	it("should ensure the modules", function(done) {

		var id = path.join(__dirname, "fixtures", "file.js");

		req.ensure(["./fixtures/file", "./fixtures/inner"], function(req2, err) {
			if(err) throw err;
			should.exist(req2);
			req2.should.be.a("function");
			should.exist(req2.preCache[id]);
			var file = req2(id);
			file.should.be.eql({value: "file"});
			done();
		});

	});

	it("should ensure the modules", function(done) {

		var id = path.join(__dirname, "fixtures", "file.js");

		var async = false;
		req.ensure(["./fixtures/file", "./fixtures/file?1"], function(req2, err) {
			if(err) throw err;
			should.exist(req2);
			req2.should.be.a("function");
			should.exist(req2.preCache[id]);
			should.exist(req2.preCache[id+"?1"]);
			var file = req2(id);
			var file1 = req2(id+"?1");
			file.should.be.eql({value: "file"});
			file1.should.be.eql({value: "file"});
			async.should.be.eql(true);
			done();
		});
		async = true;

	});

	it("should be executed synchron if empty list", function() {
		var executed = false;
		req.ensure([], function(req) {
			executed = true;
			should.exist(req);
			req.should.be.a("function");
		});
		executed.should.be.ok;
	});

});