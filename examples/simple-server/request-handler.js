var pageTemplate = require("./page.jade");
var stylesheet = require("raw!./style.css");

var requireTime = new Date();

// A simple request handler
module.exports = function(req, res) {
	if(req.url == "/") {
		res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
		res.end(pageTemplate({requireTime: requireTime, currentTime: new Date()}));
	} else if(req.url == "/style.css") {
		res.writeHead(200, {'Content-Type': 'text/css'});
		res.end(stylesheet);
	} else {
		res.writeHead(404);
		res.end("Not Found");
	}
}