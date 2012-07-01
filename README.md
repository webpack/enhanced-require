# enhanced-require

This module added [loader support](https://github.com/sokra/modules-webpack/wiki/Loader-Specification) to node.js.

It offers features availible in webpack to node.js.

Add this line to a node.js module to active the enhanced features in that module.

``` javascript
require = require("enhanced-require")(require.valueOf());
```

Than you can use them:

``` javascript
var template = require("./my-template.jade");
var fileContent = require("raw!"+__filename);
var html = template({content: fileContent});
var directoryRequire = require.context("raw!./subdir");
var txtFile = directoryRequire("./aFile.txt");
```

## Future Plans

* `require("enhanced-require/install")` enables support for all modules.

## License

Copyright (c) 2012 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)