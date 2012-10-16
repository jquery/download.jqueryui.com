## jQuery UI Download Builder

Be sure that node >= 0.8.x is installed.

`npm install` to install node modules.

`grunt prepare:[tag/branch]` to create distribution files, e.g. `grunt prepare:1.9.0` or `grunt prepare:master`

`npm test` to run the unit tests.

`node server.js` to run the server, go to the URL it outputs.

Add `--port 3000` or `--host ...` to specify custom host and port, e.g. `node server.js --port 3000`. Add `--console` to log messages in the console instead of syslog, e.g. `node server.js --console`.
