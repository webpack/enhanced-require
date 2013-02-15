# enhanced-require

More features for node.js require.

* [loader support](https://github.com/webpack/docs/wiki/loaders)
* [`require.ensure`](https://github.com/webpack/docs/wiki/require.ensure)
* [AMD](https://github.com/webpack/docs/wiki/amd) `require`, `define` (from require.js)
* [`require.context`](https://github.com/webpack/docs/wiki/require.context)
* [Hot Code Replacement](https://github.com/webpack/docs/wiki/hot-code-replacement)
* module substitutions for mocking

Asynchron require functions are **really** async. They do not use the sync node.js require, but use a async resolving and async readFile.

[documentation](https://github.com/webpack/docs/wiki)

## License

Copyright (c) 2012 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)