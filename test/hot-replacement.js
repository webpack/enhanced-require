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

	afterEach(function() {
		fs.unlinkSync(counterValuePath);
	});

	it("should accept a simple update by manual sync check", function() {
		var req = reqFactory(module, {
			hot: true,
			recursive: true
		});

		var list = req("./fixtures/hot/counter");
		list.should.be.eql([1]);
		module.hot.checkSync();
		list.should.be.eql([1]);
		writeCounter(2);
		list.should.be.eql([1]);
		module.hot.checkSync();
		list.should.be.eql([1, -1, 2]);
		module.hot.checkSync();
		list.should.be.eql([1, -1, 2]);
		writeCounter(3);
		module.hot.checkSync();
		list.should.be.eql([1, -1, 2, -2, 3]);
	});

	it("should accept a indirect update by manual sync check", function() {
		var req = reqFactory(module, {
			hot: true,
			recursive: true
		});

		var list = req("./fixtures/hot/counter-indirect");
		list.should.be.eql([1]);
		module.hot.checkSync();
		list.should.be.eql([1]);
		writeCounter(2);
		list.should.be.eql([1]);
		module.hot.checkSync();
		list.should.be.eql([1, -1, 2]);
		module.hot.checkSync();
		list.should.be.eql([1, -1, 2]);
		writeCounter(3);
		module.hot.checkSync();
		list.should.be.eql([1, -1, 2, -2, 3]);
	});

	it("should not accept a bubbling update by manual sync check", function() {
		var req = reqFactory(module, {
			hot: true,
			recursive: true
		});

		var fail = req("./fixtures/hot/not-accepted");
		writeCounter(2);
		(function() {
			module.hot.checkSync();
		}).should.throw(/bubble/);
	});

	it("should accept a update of a loaded module by manual sync check", function() {
		var req = reqFactory(module, {
			hot: true,
			recursive: true
		});

		var list = req("./fixtures/hot/loader");
		list.should.be.eql(["module.exports = 1"]);
		module.hot.checkSync();
		list.should.be.eql(["module.exports = 1"]);
		writeCounter(2);
		list.should.be.eql(["module.exports = 1"]);
		module.hot.checkSync();
		list.should.be.eql(["module.exports = 1", "MODULE.EXPORTS = 1", "module.exports = 2"]);
		module.hot.checkSync();
		list.should.be.eql(["module.exports = 1", "MODULE.EXPORTS = 1", "module.exports = 2"]);
		writeCounter(3);
		module.hot.checkSync();
		list.should.be.eql(["module.exports = 1", "MODULE.EXPORTS = 1", "module.exports = 2", "MODULE.EXPORTS = 2", "module.exports = 3"]);
	});

});