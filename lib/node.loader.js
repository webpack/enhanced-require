module.exports = function() {
	return "try {process.dlopen(" + JSON.stringify(this.filenames[0]) + ", module.exports); } catch(e) {" +
		"throw new Error('Cannot open ' + " + JSON.stringify(this.filenames[0]) + " + ': ' + e);}";
}