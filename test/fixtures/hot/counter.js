var list = [];

var value = require("./counter-value");
list.push(value);

module.exports = list;

if(module.hot) {
	module.hot.accept("./counter-value", function() {
		list.push(-value);
		value = require("./counter-value");
		list.push(value);
	});
}