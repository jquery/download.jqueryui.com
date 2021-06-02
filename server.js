#!/usr/bin/env node

"use strict";

var logger = require( "./lib/simple-log" ).init( "download.jqueryui.com" );

process.on( "uncaughtException", function( err ) {
	logger.error( "Caught exception: " + ( err.stack || err ) );
	process.exit( 1 );
} );

var frontend,
	argv = require( "yargs" ).argv,
	express = require( "express" ),
	async = require( "async" ),
	Builder = require( "./lib/builder" ),
	Cache = require( "./lib/cache" ),
	formidable = require( "formidable" ),
	Frontend = require( "./frontend" ),
	httpHost = argv.host || "0.0.0.0",
	Image = require( "./lib/themeroller-image" ),
	JqueryUi = require( "./lib/jquery-ui" ),
	Packer = require( "./lib/packer" ),
	querystring = require( "querystring" ),
	ThemeRoller = require( "./lib/themeroller" ),
	httpPort = argv.port || 8080,
	routes = {
		home: "/",
		download: "/download",
		downloadComponents: "/download/components",
		downloadTheme: "/download/theme",
		themeroller: "/themeroller",
		themerollerIcon: /^\/themeroller\/images\/(ui-icons_.+)$/,
		themerollerParseTheme: "/themeroller/parsetheme.css",
		themerollerTexture: /^\/themeroller\/images\/(ui-bg_.+)$/
	},
	app = express();

frontend = new Frontend();
if ( process.argv.indexOf( "--nocache" ) === -1 ) {
	Cache.on( 60000 * 60 );
	Packer.cacheThemeGalleryImages();

	// Cache jquery-ui-themeroller images as well
	async.forEachSeries( require( "./lib/themeroller-themegallery" )(), function( theme, callback ) {
		theme = new( require( "jquery-ui-themeroller" ) )( "", theme.vars );
		theme.generateImages( function( error, imageFiles ) {
			if ( error ) {
				error.message = "Caching theme images (2): " + error.message;
				callback( error );
				throw error;
			}
			callback();
		} );
	} );
}

// OBS: We were using an older version of connect, which lacked a descent way to centralize
// requests error handling. We use express now but we haven't updated that code.
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
	} );
	app.get( routes.download, function( request, response ) {
		response.end( frontend.download.index( params( request ), {
			wrap: true
		} ) );
	} );
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
			} );
		} );
	} );
	app.get( routes.downloadComponents, function( request, response ) {
		response.setHeader( "Content-Type", "application/json" );
		response.end( frontend.download.components( params( request ) ) );
	} );
	app.get( routes.downloadTheme, function( request, response ) {
		response.setHeader( "Content-Type", "application/json" );
		response.end( frontend.download.theme( params( request ) ) );
	} );
	app.get( routes.themeroller, function( request, response ) {
		response.end( frontend.themeroller.index( params( request ), {
			wrap: true
		} ) );
	} );
	app.get( routes.themerollerIcon, function( request, response ) {
		frontend.themeroller.icon( request.params[ 0 ], response, error );
	} );
	app.get( routes.themerollerParseTheme, function( request, response ) {
		response.setHeader( "Content-Type", "text/css" );
		response.end( frontend.themeroller.css( params( request ) ) );
	} );
	app.get( routes.themerollerTexture, function( request, response ) {
		frontend.themeroller.texture( request.params[ 0 ], response, error );
	} );
}

route( app );

// App static directories.
if ( frontend.options.env === "production" ) {
	app.use( "/resources", express.static( "app/dist" ) );
} else {
	app
		.use( "/app", express.static( "app/src" ) )
		.use( "/app/images/farbtastic", express.static( "external/farbtastic" ) )
		.use( "/external", express.static( "external" ) )
		.use( "/node_modules", express.static( "node_modules" ) )
		.use( "/template", express.static( "tmp/app/template" ) );
}

app.listen( httpPort, httpHost, function() {
	console.log( "HTTP Server running at http://%s:%d", httpHost, httpPort );
} );
