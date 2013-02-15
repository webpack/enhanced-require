var should = require("should");
var path = require("path");
var fs = require("fs");
var reqFactory = require("../");

describe("hot-replacement", function() {

	this.timeout(10000);

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
			hot: true
		});

		var list = req("./fixtures/hot/counter");
		list.should.be.eql([1]);
		req.hot.check(function(err, updatedModules) {
			if(err) throw err;
			should.not.exist(updatedModules);
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
					should.not.exist(updatedModules);
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
			hot: true
		});

		var list = req("./fixtures/hot/counter-indirect");
		list.should.be.eql([1]);
		req.hot.check(function(err, updatedModules) {
			if(err) throw err;
			should.not.exist(updatedModules);
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
					should.not.exist(updatedModules);
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

	it("should not accept a bubbling update by manual check", function(done) {
		var req = reqFactory(module, {
			hot: true
		});

		var fail = req("./fixtures/hot/not-accepted");
		setTimeout(function() {
			writeCounter(2);
			req.hot.check(function(err, updatedModules) {
				should.exist(err);
				should.not.exist(updatedModules);
				err.should.be.instanceOf(Error);
				/bubbling/.test(err.toString()).should.be.ok;
				done();
			});
		}, 1000);
	});

	it("should accept a update of a loaded module by manual check", function(done) {
		var req = reqFactory(module, {
			hot: true
		});

		var list = req("./fixtures/hot/loader");
		list.should.be.eql(["module.exports = 1"]);
		req.hot.check(function(err, updatedModules) {
			if(err) throw err;
			should.not.exist(updatedModules);
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
					should.not.exist(updatedModules);
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
			watch: true,
			watchDelay: 200
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
						writeCounter(4);
						setTimeout(function() {
							list.should.be.eql([1, -1, 2, -2, 4]);
							req.hot.stop();
							done();
						}, 300);
					}, 100);
				}, 1000);
			}, 300);
		}, 1000);
	});

	it("should wait for apply if applyOnUpdate = false", function(done) {
		var req = reqFactory(module, {
			hot: true,
			watch: true,
			watchDelay: 10
		});

		var list = req("./fixtures/hot/counter");
		req.hot.setApplyOnUpdate(false);
		list.should.be.eql([1]);
		setTimeout(function() {
			list.should.be.eql([1]);
			writeCounter(2);
			setTimeout(function() {
				list.should.be.eql([1]);
				req.hot.status().should.be.eql("ready");
				req.hot.apply(function(err, outdatedModules) {
					should.not.exist(err);
					should.exist(outdatedModules);
					outdatedModules.should.have.property("length").be.eql(1);
					outdatedModules[0].id.should.be.eql(counterValuePath);
					req.hot.status().should.be.eql("watch");
					list.should.be.eql([1, -1, 2]);
					writeCounter(3);
					setTimeout(function() {
						req.hot.status().should.be.eql("ready");
						req.hot.apply(function(err, outdatedModules) {
							should.not.exist(err);
							should.exist(outdatedModules);
							outdatedModules.should.have.property("length").be.eql(1);
							outdatedModules[0].id.should.be.eql(counterValuePath);
							req.hot.status().should.be.eql("watch");
							list.should.be.eql([1, -1, 2, -2, 3]);
							req.hot.stop();
							done();
						});
					}, 100);
				});
			}, 100);
		}, 100);
	});
});