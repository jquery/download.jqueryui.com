#!/usr/bin/env node

var logger = require( "simple-log" ).init( "download.jqueryui.com" );

process.on( "uncaughtException", function ( err ) {
	logger.error( "Caught exception: " + ( err.stack || err ) );
	process.exit( 1 );
});

var frontend, server,
	argv = require( "optimist" ).argv,
	async = require( "async" ),
	Builder = require( "./lib/builder" ),
	Cache = require( "./lib/cache" ),
	connect = require( "connect" ),
	formidable = require( "formidable" ),
	Frontend = require( "./frontend" ),
	httpHost = argv.host || "localhost",
	Image = require( "./lib/themeroller-image" ),
	JqueryUi = require( "./lib/jquery-ui" ),
	Packer = require( "./lib/packer" ),
	querystring = require( "querystring" ),
	ThemeRoller = require( "./lib/themeroller" ),
	httpPort = argv.port || 8088,
	routes = {
		home: "/",
		download: "/download",
		downloadComponents: "/download/components",
		downloadTheme: "/download/theme",
		themeroller: "/themeroller",
		themerollerIcon: /^\/themeroller\/images\/(ui-icons_.+)$/,
		themerollerParseTheme: "/themeroller/parsetheme.css",
		themerollerTexture: /^\/themeroller\/images\/(ui-bg_.+)$/
	};

frontend = new Frontend();
if ( process.argv.indexOf( "--nocache" ) === -1 ) {
	Cache.on( 60000 * 60 );
	Packer.cacheThemeGalleryImages();

	// Cache jquery-ui-themeroller images as well
	async.forEachSeries( require( "./lib/themeroller-themegallery" )(), function( theme, callback ) {
		theme = new (require( "jquery-ui-themeroller" ))( "", theme.vars );
		theme.generateImages(function( error, imageFiles ) {
			if ( error ) {
				error.message = "Caching theme images (2): " + error.message;
				callback( error );
				throw error;
			}
			callback();
		});
	});
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
			if ( err ) {
				return error( err, response );
			}
			frontend.download.create( fields, response, function( err ) {
				if ( err ) {
					return error( err, response );
				}
			});
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
	app.get( routes.themerollerTexture, function( request, response ) {
		frontend.themeroller.texture( request.params[ 0 ], response, error );
	});
}


server = connect( connect.router( route ) );

// App static directories.
if ( frontend.options.env === "production" ) {
	server.use( "/resources", connect[ "static" ]( "app/dist" ) );
} else {
	server
		.use( "/app", connect[ "static" ]( "app/src" ) )
		.use( "/app/images/farbtastic", connect[ "static" ]( "external/farbtastic" ) )
		.use( "/external", connect[ "static" ]( "external" ) )
		.use( "/template", connect[ "static" ]( "tmp/app/template" ) );
}

server.listen( httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
});
