## jQuery UI Download Builder

`npm install` to install node modules.

`grunt prepare:[tag/branch]` to create distribution files, e.g. `grunt prepare:1.9.0` or `grunt prepare:master`

`node cli-test.js` to run the backend, outputs `result.zip`

`node build-server.js` to run the server, go to the URL it outputs.

Add `--port 3000` or `--host ...` to specify custom host and port, e.g. `node build-server.js --port 3000`