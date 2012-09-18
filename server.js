#!/usr/bin/env node
var argv = require( "optimist" ).argv,
	Builder = require( "./lib/builder" ),
	connect = require( "connect" ),
	deserialize = require( "./lib/util" ).deserialize,
	formidable = require( "formidable" ),
	Frontend = require( "./frontend" ),
	httpHost = argv.host || "localhost",
	httpPort = argv.port || 8088,
	routes = {
		home: "/",
		download: "/download",
		themeroller: "/themeroller",
		themerollerParseTheme: "/themeroller/parsetheme.css",
		themerollerRollYourOwn: "/themeroller/rollertabs"
	},
	staticDir = "app",
	ThemeRoller = require( "./lib/themeroller" );

var frontend = new Frontend();

function route(app) {
	app.get( routes.home, function( request, response, next ) {
		response.end( frontend.root() );
	});
	app.get( routes.download, function( request, response, next) {
		response.end( frontend.download.index( deserialize( request.url ), {
			wrap: true
		}));
	});
	app.post( routes.download, function( request, response, next) {
		var form = new formidable.IncomingForm();
		form.parse( request, function( err, fields, files ) {
			var field, builder, themeVars,
				components = [];
			themeVars = fields.theme == "none" ? null : deserialize( "?" + fields.theme );
			if ( themeVars !== null && fields.themeFolderName.length > 0 ) {
				themeVars.folderName = fields.themeFolderName;
			}
			if ( fields.scope.length > 0 ) {
				themeVars.scope = fields.scope;
			}
			delete fields.theme;
			delete fields.themeFolderName;
			delete fields.scope;
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
		response.end( frontend.themeroller.index( deserialize( request.url ), {
			wrap: true
		}));
	});
	app.get( routes.themerollerParseTheme, function( request, response, next ) {
		response.setHeader( "Content-Type", "text/css" );
		response.end( frontend.themeroller.css( deserialize( request.url ) ) );
	});
	app.get( routes.themerollerRollYourOwn, function( request, response, next ) {
		response.end( frontend.themeroller.rollYourOwn( deserialize( request.url ) ) );
	});
}

connect.createServer(
	connect.router( route ),
	connect[ "static" ]( staticDir )
).listen(httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
});
