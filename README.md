# enhanced-require

More features for node.js require.

* [loader support](https://github.com/sokra/modules-webpack/wiki/Loader-Specification)
* `require.ensure`
* AMD `require`, `define` (from require.js)
* `require.context`

Asynchron require functions are **really** async. They do not use the sync node.js require, but use a async resolving and async readFile.

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
	bDep.run();
});
```

## Future Plans

* `require("enhanced-require/install")` enables support for all modules.

## License

Copyright (c) 2012 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)