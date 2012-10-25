var list = [];

var value = require("raw!./counter-value");
list.push(value);

module.exports = list;

if(module.hot) {
	module.hot.accept("raw!./counter-value", function() {
		list.push(value.toUpperCase());
		value = require("raw!./counter-value");
		list.push(value);
	});
}