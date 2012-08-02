#!/usr/bin/env node
var connect = require( "connect" ),
	formidable = require( "formidable" ),
	argv = require( "optimist" ).argv,
	frontend = require( "./build-frontend" ),
	Builder = require( "./build-backend" ),
	httpPort = argv.port || 8088,
	httpHost = argv.host || "localhost",
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
			var field, builder,
				list = [];
			for ( field in fields ) {
				list.push( field );
			}
			builder = new Builder( list );
			response.setHeader( "Content-Type", "application/zip" );
			response.setHeader( "Content-Disposition", "attachment; filename=" + builder.filename() );
			builder.writeTo( response, function() {
				response.end();
			});
		});
	});
}

connect.createServer(
	connect.router( route ),
	connect[ "static" ]( staticDir )
).listen(httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
});
