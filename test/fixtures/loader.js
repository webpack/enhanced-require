module.exports = function(source) {
	var canAsync = this.async();
	var result = "exports.async = " + JSON.stringify(!!canAsync) + ";\n" +
		"exports.loader = " + JSON.stringify(this) + ";\n" +
		source;
	if(canAsync) canAsync(null, result);
	else return result;
}