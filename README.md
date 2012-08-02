## jQuery UI Download Builder

Run a jQuery UI build with `grunt release`, then copy over the result, e.g.
`dist/jquery-ui-1.9` into the `versions` dir into this project.

Also run the `grunt manifest` task (from manifest branch if its not yet in
master) and move the *.jquery.json files into that same folder.

`npm install` to install node modules.

`node cli-test.js` to run the backend, outputs `result.zip`

`node build-server.js` to run the server, go to the URL it outputs.

Add `--port 3000` or `--host ...` to specify custom host and port.