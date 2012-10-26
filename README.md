# enhanced-require

More features for node.js require.

* [loader support](https://github.com/sokra/modules-webpack/wiki/Loader-Specification)
* `require.ensure`
* AMD `require`, `define` (from require.js)
* `require.context`
* Hot Code Replacement

Asynchron require functions are **really** async. They do not use the sync node.js require, but use a async resolving and async readFile.

## Single module

Add this line to a node.js module to activate the enhanced features in that module:

``` javascript
require = require("enhanced-require")(module);

// and optionally if your want require.js style defines:
if(typeof define != "function") var define = require.define;
```

Than you can use them:

``` javascript
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

## Complete application

Create a seperate entry module and require your original entry module:

``` javascript
require = require("enhanced-require")(module, {
	recursive: true, // enable for all modules
	hot: true, // enable hot code replacement
	watch: true // watch for changes
});

require("./startup");
```

You can use all features in `startup.js` and all required modules.

For hot code reloading you need to follow the [hot code reloading spec](https://github.com/webpack/enhanced-require/wiki/HCR-Spec).

## Future Plans

* cli tool

## License

Copyright (c) 2012 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)