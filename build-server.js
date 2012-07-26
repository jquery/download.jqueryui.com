#!/usr/bin/env node
/*jshint node: true */
"use strict";

var connect = require( "connect" ),
	formidable = require( "formidable" ),
	frontend = require( "./build-frontend" ),
	Builder = require( "./build-backend" );

var httpPort = 8088,
	httpHost = "localhost",
	staticDir = "app",
	routes = {
		home: "/",
		download: "/download"
	};

function route(app) {
	app.get( routes.home, function( request, response, next ) {
		response.end( frontend.wrapped() );
	});
	app.post( routes.download, function( request, response, next) {
		var form = new formidable.IncomingForm();
		form.parse( request, function( err, fields, files ) {
			var list = [];
			for ( var field in fields ) {
				list.push( field );
			}
			response.setHeader( "Content-Type", "application/zip" );
			response.setHeader( "Content-Disposition", "attachment; filename=jquery-ui-custom-1.9.zip" );
			// TODO use child_process.fork and process.send to make building response async
			// see https://gist.github.com/6d635e9001b92215266a
			new Builder( list ).writeTo( response, function() {
				response.end();
			});
		});
	});
}

connect.createServer(
	connect.router(route),
	connect.static(staticDir)
).listen(httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
});
