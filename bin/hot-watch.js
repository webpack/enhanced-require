#!/usr/bin/env node

var path = require("path");
var file = process.argv.splice(2, 1)[0].split("!");

file.push(path.resolve(file.pop()));

require("../lib/require")(process.cwd(), {
	recursive: true,
	hot: true,
	watch: true
})(file.join("!"));