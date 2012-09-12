#!/usr/bin/env node
var connect = require( "connect" ),
	formidable = require( "formidable" ),
	argv = require( "optimist" ).argv,
	download = require( "./download" ),
	themeroller = require( "./themeroller" ),
	Builder = require( "./lib/builder" ),
  ThemeRoller = require( "./lib/themeroller" ),
	httpPort = argv.port || 8088,
	httpHost = argv.host || "localhost",
	staticDir = "app",
	routes = {
		home: "/",
		download: "/download",
		themeroller: "/themeroller",
		themerollerParseTheme: "/themeroller/parsetheme.css"
	},
	url = require( "url" );

function route(app) {
	app.get( routes.home, function( request, response, next ) {
		response.end( download.index() );
	});
	app.post( routes.download, function( request, response, next) {
		var form = new formidable.IncomingForm();
		form.parse( request, function( err, fields, files ) {
			var field, builder,
				list = [];
			for ( field in fields ) {
				list.push( field );
			}
			var theme = new ThemeRoller();
			builder = new Builder( list, theme );
			response.setHeader( "Content-Type", "application/zip" );
			response.setHeader( "Content-Disposition", "attachment; filename=" + builder.filename() );
			builder.writeTo( response, function() {
				response.end();
			});
		});
	});
	app.get( routes.themeroller, function( request, response, next ) {
		var url_parts = url.parse(request.url, true);
		var query = url_parts.query;
		response.end( themeroller.index( query ) );
	});
	app.get( routes.themerollerParseTheme, function( request, response, next ) {
		var url_parts = url.parse(request.url, true);
		var query = url_parts.query;
		console.log( query ); // FIXME remove me
		response.setHeader( "Content-Type", "text/css" );
		response.end( themeroller.css( query ) );
	});
}

connect.createServer(
	connect.router( route ),
	connect[ "static" ]( staticDir )
).listen(httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
});
