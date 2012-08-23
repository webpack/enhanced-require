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
		clean(req.contentCache);
		clean(req.sourceCache);
	});
	
	it("should ensure the modules", function(done) {
		
		var id = path.join(__dirname, "fixtures", "file.js");
		
		req.ensure(["./fixtures/file", "./fixtures/inner"], function(req2) {
			should.exist(req2);
			req2.should.be.a("function");
			should.exist(req2.sourceCache[id]);
			var file = req2(id);
			file.should.be.eql({value: "file"});
			done();
		});
		
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