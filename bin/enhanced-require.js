#!/usr/bin/env node

var path = require("path");
var file = process.argv.splice(2, 1)[0].split("!");

file.push(path.resolve(file.pop()));

var config = {};

var existsSync = require("fs").existsSync || path.existsSync;
var configFile = path.resolve("enhanced-require.config.js");
if(existsSync(configFile))
	config = require(configFile);

require("../lib/require")(process.cwd(), config)(file.join("!"));