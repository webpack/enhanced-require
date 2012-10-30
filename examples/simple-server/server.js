var http = require("http");
var requestHandler = require("./request-handler");

// Create the server
var server = http.createServer(requestHandler);
server.listen(8080, function() {
	console.log("Server is listening... :)");
});

if(module.hot) {

	// accept changes of the request handler
	module.hot.accept("./request-handler", function() {
		require(["./request-handler"], function(newRequestHandler) {
			server.removeListener("request", requestHandler);
			requestHandler = newRequestHandler;
			server.on("request", requestHandler);
		});
	});

	// We care about updates of this file
	// This is not required if you only change the request handler
	module.hot.accept();
	module.hot.dispose(function() {
		// Don't handle requests anymore, but close keep-alive connections
		server.removeListener("request", requestHandler);
		server.on("request", function(req, res) {
			res.writeHead(302, {Connection: "close", Location: req.url});
			res.end("Server updated. Please reconnect.");
		});
		// Close the server
		server.close();
	});
}