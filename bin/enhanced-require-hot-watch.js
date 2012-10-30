#!/usr/bin/env node

var path = require("path");
var file = process.argv.splice(2, 1);

require("../lib/require")(module, {
	recursive: true,
	hot: true,
	watch: true
})(path.resolve(file[0]));