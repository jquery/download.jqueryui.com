#!/usr/bin/env node

process.on( "uncaughtException", function ( err ) {
	console.error( "Caught exception: ", err.stack || err );
	require( "logger" ).init( "download.jqueryui.com" ).log( "Caught exception: " + ( err.stack || err ) );
	process.exit( 1 );
});

var argv = require( "optimist" ).argv,
	Builder = require( "./lib/builder" ),
	connect = require( "connect" ),
	querystring = require( "querystring" ),
	formidable = require( "formidable" ),
	Frontend = require( "./frontend" ),
	httpHost = argv.host || "localhost",
	httpPort = argv.port || 8088,
	routes = {
		home: "/",
		download: "/download",
		downloadTheme: "/download/theme",
		themeroller: "/themeroller",
		themerollerParseTheme: "/themeroller/parsetheme.css",
		themerollerRollYourOwn: "/themeroller/rollyourown"
	},
	staticDir = "app",
	ThemeRoller = require( "./lib/themeroller" );

var frontend = new Frontend();

function params( request ) {
	return querystring.parse( request.url.split( "?" )[ 1 ] );
}

function route(app) {
	app.get( routes.home, function( request, response, next ) {
		response.end( frontend.root() );
	});
	app.get( routes.download, function( request, response, next) {
		response.end( frontend.download.index( params( request ), {
			wrap: true
		}));
	});
	app.post( routes.download, function( request, response, next) {
		var form = new formidable.IncomingForm();
		form.parse( request, function( err, fields, files ) {
			var field, builder, themeVars,
				components = [];
			themeVars = fields.theme == "none" ? null : querystring.parse( fields.theme );
			if ( themeVars !== null && fields.themeFolderName ) {
				themeVars.folderName = fields.themeFolderName;
			}
			if ( fields.scope ) {
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
			builder.writeTo( response, function( err, result ) {
				if ( err ) {
					response.writeHead( 500, err.message );
				}
				response.end();
			});
		});
	});
	app.get( routes.downloadTheme, function( request, response, next ) {
		response.setHeader( "Content-Type", "application/json" );
		response.end( frontend.download.theme( params( request ) ) );
	});
	app.get( routes.themeroller, function( request, response, next ) {
		response.end( frontend.themeroller.index( params( request ), {
			wrap: true
		}));
	});
	app.get( routes.themerollerParseTheme, function( request, response, next ) {
		response.setHeader( "Content-Type", "text/css" );
		response.end( frontend.themeroller.css( params( request ) ) );
	});
	app.get( routes.themerollerRollYourOwn, function( request, response, next ) {
		response.setHeader( "Content-Type", "application/json" );
		response.end( frontend.themeroller.rollYourOwn( params( request ) ) );
	});
}

connect.createServer(
	connect.router( route ),
	connect[ "static" ]( staticDir )
).listen(httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
});
