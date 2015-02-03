var should = require("should");
var path = require("path");
var reqFactory = require("../");

describe('module-paths', function () {
    var req = reqFactory(module, {
        recursive: true
    });

    var graphModule = req("./fixtures/paths/a");

    it("should have correct ids", function() {
        graphModule.id.should.be.eql(req.resolve("./fixtures/paths/a"));
        graphModule.b.id.should.be.eql(req.resolve("./fixtures/paths/b"));
    });
});
