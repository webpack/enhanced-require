# enhanced-require

More features for node.js require.

* [loader support](https://github.com/sokra/modules-webpack/wiki/Loader-Specification)
* `require.ensure`
* AMD `require`, `define` (from require.js)
* `require.context`
* [Hot Code Replacement](https://github.com/webpack/enhanced-require/wiki/HCR-Spec)
* module substitutions for mocking

Asynchron require functions are **really** async. They do not use the sync node.js require, but use a async resolving and async readFile.

## Create a enhanced require function

``` javascript
var bootstrap = require("enhanced-require")(module, {
	// options
	recursive: true // enable for all modules recursivly
	// This replaces the original require function in loaded modules
});

// startup your application
bootstrap("./startup");
```

## Usage

Than you can use them:

``` javascript
// File: startup.js

// use loaders
var fileContent = require("raw!"+__filename);

// use loaders automatically
var template = require("./my-template.jade");

var html = template({content: fileContent});

// use require.context
var directoryRequire = require.context("raw!./subdir");
var txtFile = directoryRequire("./aFile.txt");

// use require.ensure
require.ensure(["./someFile.js"], function(require) {
	var someFile = require("./someFile.js");
});

// use AMD define
require.define(["./aDep"], function(aDep) {
	aDep.run();
});

// use AMD require
require(["./bDep"], function(bDep) {
	bDep.doSomething();
});
```

## Hot Code Replacement

``` javascript
require("enhanced-require")(module, {
	recursive: true, // enable for all modules
	hot: true, // enable hot code replacement
	watch: true // watch for changes
})("./startup");
```

For hot code reloading you need to follow the [hot code reloading spec](https://github.com/webpack/enhanced-require/wiki/HCR-Spec).

## Testing/Mocking

``` javascript
var er = require("enhanced-require");
it("should read the config option", function(done) {
	var subject = er(module, {
		recursive: true,
		substitutions: {
			// specify the exports of a module directly
			"../lib/config.json": {
				"test-option": { value: 1234 }
			}
		},
		substitutionFactories: {
			// specify lazy generated exports of a module
			"../lib/otherConfig.json": function(require) {
				// export the same object as "config.json"
				return require("../lib/config.json");
			}
		}
	})("../lib/subject");

	var result = subject.getConfigOption("test-option");
	should.exist(result);
	result.should.be.eql({ value: 1234 });
});
```

## Options

``` javascript
{
	recursive: false,
	// replace require function in required modules with enhanced require method

	resolve: {
		// ...
		// see enhanced-resolve
		// https://github.com/webpack/enhanced-resolve
	},
	
	substitutions: {},
	substitutionFactories: {},
	// See above
	// Replace modules with mocks
	// keys are resolved and have to exist

	amd: {},
	// The require.amd object

	enhanced: {},
	// The require.enhanced object

	loader: {},
	// additional stuff in the loaderContext

	hot: false,
	// enable hot code replacement

	watch: false,
	// Watch for file changes and issue hot replacement

	watchDelay: 400,
	// Time to summarize changes for watching
}
```

## Future Plans

* cli tool

## License

Copyright (c) 2012 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)
