# simple-server

## Startup

```
node ../../bin/hot-watch server.js
```

Or if you have `enhanced-require` installed globally:

```
enhanced-require-hot-watch server.js
```

## Action

It opens a server at `http://localhost:8080` which serves the page.

The page refreshs itself to demostrate changes in the server code.

You can edit any file from the example. The server will hot replace the code and reflect updates. The http server will not be restarted except if you edit `server.js`. The node process will never be restarted.