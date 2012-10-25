var list = [];

var value = require("./get-counter-value");
list.push(value);

module.exports = list;

if(module.hot) {
	module.hot.accept("./get-counter-value", function() {
		list.push(-value);
		value = require("./get-counter-value");
		list.push(value);
	});
}