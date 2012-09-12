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

function urlQuery( requestUrl ) {
		var urlParts = url.parse( requestUrl, true );
		return urlParts.query;
}

function route(app) {
	app.get( routes.home, function( request, response, next ) {
		response.end( download.index( urlQuery( request.url ) ) );
	});
	app.post( routes.download, function( request, response, next) {
		var form = new formidable.IncomingForm();
		form.parse( request, function( err, fields, files ) {
			var field, builder, themeVars,
				components = [];
			themeVars = fields.theme == "none" ? null : urlQuery( "?" + fields.theme );
			delete fields.theme;
			for ( field in fields ) {
				components.push( field );
			}
			var theme = new ThemeRoller( themeVars );
			builder = new Builder( components, theme );
			response.setHeader( "Content-Type", "application/zip" );
			response.setHeader( "Content-Disposition", "attachment; filename=" + builder.filename() );
			builder.writeTo( response, function() {
				response.end();
			});
		});
	});
	app.get( routes.themeroller, function( request, response, next ) {
		response.end( themeroller.index( urlQuery( request.url ) ) );
	});
	app.get( routes.themerollerParseTheme, function( request, response, next ) {
		response.setHeader( "Content-Type", "text/css" );
		response.end( themeroller.css( urlQuery( request.url ) ) );
	});
}

connect.createServer(
	connect.router( route ),
	connect[ "static" ]( staticDir )
).listen(httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
});
