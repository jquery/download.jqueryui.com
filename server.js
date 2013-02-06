#!/usr/bin/env node

var logger = require( "simple-log" ).init( "download.jqueryui.com" );

process.on( "uncaughtException", function ( err ) {
	logger.error( "Caught exception: " + ( err.stack || err ) );
	process.exit( 1 );
});

var argv = require( "optimist" ).argv,
	Builder = require( "./lib/builder" ),
	connect = require( "connect" ),
	formidable = require( "formidable" ),
	Frontend = require( "./frontend" ),
	Image = require( "./lib/themeroller.image" ),
	querystring = require( "querystring" ),
	Release = require( "./lib/release" ),
	ThemeRoller = require( "./lib/themeroller" ),
	httpHost = argv.host || "localhost",
	httpPort = argv.port || 8088,
	routes = {
		home: "/",
		download: "/download",
		downloadComponents: "/download/components",
		downloadTheme: "/download/theme",
		themeroller: "/themeroller",
		themerollerIcon: /^\/themeroller\/images\/(ui-icons_.+)$/,
		themerollerParseTheme: "/themeroller/parsetheme.css",
		themerollerRollYourOwn: "/themeroller/rollyourown",
		themerollerTexture: /^\/themeroller\/images\/(ui-bg_.+)$/
	},
	staticDir = "app";

var frontend = new Frontend();
if ( process.argv.indexOf( "--nocache" ) === -1 ) {
	Builder.cacheReleases();
	Builder.cacheThemeImages();
	Image.setCacheExpires( 60000 * 60 );
}

// OBS: We are using an older version of connect, which lacks a descent way to centralize requests error handling.
function error( err, response ) {
	logger.error( "User request exception: " + ( err.stack || err ) );
	frontend.error( response );
}

function params( request ) {
	return querystring.parse( request.url.split( "?" )[ 1 ] );
}

function route( app ) {
	app.get( routes.home, function( request, response ) {
		response.end( frontend.root() );
	});
	app.get( routes.download, function( request, response ) {
		response.end( frontend.download.index( params( request ), {
			wrap: true
		}));
	});
	app.post( routes.download, function( request, response ) {
		var form = new formidable.IncomingForm();
		form.parse( request, function( err, fields, files ) {
			try {
				var builder, field, theme, version,
					themeVars = null,
					components = [];
				if ( fields.theme !== "none" ) {
					themeVars = querystring.parse( fields.theme );
				}
				// Override with fields if they exist
				if ( themeVars !== null ) {
					themeVars.folderName = fields[ "theme-folder-name" ] || themeVars.folderName;
					themeVars.scope = fields.scope || themeVars.scope;
				}
				version = fields.version;
				delete fields.scope;
				delete fields.theme;
				delete fields[ "theme-folder-name" ];
				delete fields.version;
				for ( field in fields ) {
					components.push( field );
				}
				theme = new ThemeRoller({
					vars: themeVars,
					version: version
				});
				builder = new Builder( Release.find( version ), components, theme );
				response.setHeader( "Content-Type", "application/zip" );
				response.setHeader( "Content-Disposition", "attachment; filename=" + builder.filename() );
				builder.writeTo( response, function( err, result ) {
					if ( err ) {
						error( err, response );
					}
				});
			} catch( err ) {
				error( err, response );
			}
		});
	});
	app.get( routes.downloadComponents, function( request, response ) {
		response.setHeader( "Content-Type", "application/json" );
		response.end( frontend.download.components( params( request ) ) );
	});
	app.get( routes.downloadTheme, function( request, response ) {
		response.setHeader( "Content-Type", "application/json" );
		response.end( frontend.download.theme( params( request ) ) );
	});
	app.get( routes.themeroller, function( request, response ) {
		response.end( frontend.themeroller.index( params( request ), {
			wrap: true
		}));
	});
	app.get( routes.themerollerIcon, function( request, response ) {
		frontend.themeroller.icon( request.params[ 0 ], response, error );
	});
	app.get( routes.themerollerParseTheme, function( request, response ) {
		response.setHeader( "Content-Type", "text/css" );
		response.end( frontend.themeroller.css( params( request ) ) );
	});
	app.get( routes.themerollerRollYourOwn, function( request, response ) {
		response.setHeader( "Content-Type", "application/json" );
		response.end( frontend.themeroller.rollYourOwn( params( request ) ) );
	});
	app.get( routes.themerollerTexture, function( request, response ) {
		frontend.themeroller.texture( request.params[ 0 ], response, error );
	});
}

connect.createServer(
	connect.router( route ),
	connect[ "static" ]( staticDir )
).listen( httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
});
