var should = require("should");
var path = require("path");
var fs = require("fs");
var reqFactory = require("../");

describe("hot-replacement", function() {

	var counterValuePath = path.join(__dirname, "fixtures", "hot", "counter-value.js");

	beforeEach(function() {
		writeCounter(1);
	});

	function writeCounter(counter) {
		fs.writeFileSync(counterValuePath, "module.exports = " + counter, "utf-8");
	}

	after(function() {
		try {
			fs.unlinkSync(counterValuePath);
		} catch(e) {}
	});

	it("should accept a simple update by manual check", function(done) {
		var req = reqFactory(module, {
			hot: true,
			recursive: true
		});

		var list = req("./fixtures/hot/counter");
		list.should.be.eql([1]);
		req.hot.check(function(err, updatedModules) {
			if(err) throw err;
			should.exist(updatedModules);
			updatedModules.should.be.eql([]);
			list.should.be.eql([1]);
			writeCounter(2);
			list.should.be.eql([1]);
			req.hot.check(function(err, updatedModules) {
				if(err) throw err;
				should.exist(updatedModules);
				updatedModules.length.should.be.eql(1);
				list.should.be.eql([1, -1, 2]);
				req.hot.check(function(err, updatedModules) {
					if(err) throw err;
					should.exist(updatedModules);
					updatedModules.should.be.eql([]);
					list.should.be.eql([1, -1, 2]);
					writeCounter(3);
					req.hot.check(function(err, updatedModules) {
						if(err) throw err;
						should.exist(updatedModules);
						updatedModules.length.should.be.eql(1);
						list.should.be.eql([1, -1, 2, -2, 3]);
						done();
					});
				});
			});
		});
	});

	it("should accept a indirect update by manual check", function(done) {
		var req = reqFactory(module, {
			hot: true,
			recursive: true
		});

		var list = req("./fixtures/hot/counter-indirect");
		list.should.be.eql([1]);
		req.hot.check(function(err, updatedModules) {
			if(err) throw err;
			should.exist(updatedModules);
			updatedModules.should.be.eql([]);
			list.should.be.eql([1]);
			writeCounter(2);
			list.should.be.eql([1]);
			req.hot.check(function(err, updatedModules) {
				if(err) throw err;
				should.exist(updatedModules);
				updatedModules.length.should.be.eql(2);
				list.should.be.eql([1, -1, 2]);
				req.hot.check(function(err, updatedModules) {
					if(err) throw err;
					should.exist(updatedModules);
					updatedModules.should.be.eql([]);
					list.should.be.eql([1, -1, 2]);
					writeCounter(3);
					req.hot.check(function(err, updatedModules) {
						if(err) throw err;
						should.exist(updatedModules);
						updatedModules.length.should.be.eql(2);
						list.should.be.eql([1, -1, 2, -2, 3]);
						done();
					});
				});
			});
		});
	});

	it("should not accept a bubbling update by manual sync check", function(done) {
		var req = reqFactory(module, {
			hot: true,
			recursive: true
		});

		var fail = req("./fixtures/hot/not-accepted");
		writeCounter(2);
		req.hot.check(function(err, updatedModules) {
			should.exist(err);
			should.not.exist(updatedModules);
			err.should.be.instanceOf(Error);
			/bubble/.test(err.toString()).should.be.ok;
			done();
		});
	});

	it("should accept a update of a loaded module by manual check", function(done) {
		var req = reqFactory(module, {
			hot: true,
			recursive: true
		});

		var list = req("./fixtures/hot/loader");
		list.should.be.eql(["module.exports = 1"]);
		req.hot.check(function(err, updatedModules) {
			if(err) throw err;
			should.exist(updatedModules);
			updatedModules.should.be.eql([]);
			list.should.be.eql(["module.exports = 1"]);
			writeCounter(2);
			list.should.be.eql(["module.exports = 1"]);
			req.hot.check(function(err, updatedModules) {
				if(err) throw err;
				should.exist(updatedModules);
				updatedModules.length.should.be.eql(1);
				list.should.be.eql(["module.exports = 1", "MODULE.EXPORTS = 1", "module.exports = 2"]);
				req.hot.check(function(err, updatedModules) {
					if(err) throw err;
					should.exist(updatedModules);
					updatedModules.should.be.eql([]);
					list.should.be.eql(["module.exports = 1", "MODULE.EXPORTS = 1", "module.exports = 2"]);
					writeCounter(3);
					req.hot.check(function(err, updatedModules) {
						if(err) throw err;
						should.exist(updatedModules);
						updatedModules.length.should.be.eql(1);
						list.should.be.eql(["module.exports = 1", "MODULE.EXPORTS = 1", "module.exports = 2", "MODULE.EXPORTS = 2", "module.exports = 3"]);
						done();
					});
				});
			});
		});
	});

	it("should accept a simple update by watch", function(done) {
		var req = reqFactory(module, {
			hot: true,
			recursive: true,
			watch: true,
			watchDelay: 10
		});

		var list = req("./fixtures/hot/counter");
		list.should.be.eql([1]);
		setTimeout(function() {
			list.should.be.eql([1]);
			writeCounter(2);
			setTimeout(function() {
				list.should.be.eql([1, -1, 2]);
				setTimeout(function() {
					list.should.be.eql([1, -1, 2]);
					writeCounter(3);
					setTimeout(function() {
						list.should.be.eql([1, -1, 2, -2, 3]);
						done();
					}, 100);
				}, 100);
			}, 100);
		}, 100);
	});


});