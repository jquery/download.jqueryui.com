"use strict";

var cache, downloadLogger, jqueryUis,
	Cache = require( "./lib/cache" ),
	fs = require( "node:fs" ),
	Handlebars = require( "handlebars" ),
	JqueryUi = require( "./lib/jquery-ui" ),
	Packager = require( "node-packager" ),
	querystring = require( "querystring" ),
	themeGallery = require( "./lib/themeroller-themegallery" )(),
	ThemeRoller = require( "./lib/themeroller" ),
	winston = require( "winston" );

cache = new Cache( "Built Packages Cache" );

downloadLogger = winston.createLogger( {
	format: winston.format.simple(),
	transports: [
		new winston.transports.File( {
			filename: __dirname + "/log/downloads.log"
		} )
	]
} );

jqueryUis = JqueryUi.all();

Handlebars.registerHelper( "isVersionChecked", function( jqueryUi ) {
	return JqueryUi.getStable().pkg.version === jqueryUi.pkg.version ? " checked=\"checked\"" : "";
} );

Handlebars.registerHelper( "join", function( array, sep, options ) {
		return array.map( function( item ) {
			return options.fn( item );
		} ).join( sep );
} );

var indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/index.html", "utf8" ) ),
	jsonpTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/jsonp.js", "utf8" ) ),
	wrapTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/wrap.html", "utf8" ) );

var Frontend = function( args ) {
	Object.assign( this, args );
};

Frontend.prototype = {
	index: function( params, options ) {
		var production = this.env.toLowerCase() === "production";
		options = options || {};
		if ( options.wrap ) {
			options = {
				...options,
				wrap: false
			};
			return wrapTemplate( {
				body: this.index( params, options ),
				resources: this.resources
			} );
		}
		return indexTemplate( {
			baseVars: themeGallery[ 2 ].serializedVars,
			components: JSON.stringify( {
				categories: JqueryUi.getStable().categories
			} ),
			host: this.host,
			lzmaWorker: production ? "/resources/external/lzma_worker.min.js" : "/node_modules/lzma/src/lzma_worker.js",
			production: production,
			resources: this.resources,
			jqueryUis: jqueryUis
		} );
	},

	components: function( params ) {
		var data, jqueryUi;
		if ( params.version ) {
			jqueryUi = JqueryUi.find( params.version );
		}
		if ( jqueryUi == null ) {
			console.error( "Invalid input \"version\" = \"" + params.version + "\"" );
			data = { error: "invalid version" };
		} else {
			data = { categories: jqueryUi.categories };
		}
		return jsonpTemplate( {
			callback: params.callback,
			data: JSON.stringify( data )
		} );
	},

	create: function( fields, response, callback ) {
		try {
			var components, jqueryUi, Package, packager,
				themeVars = null;

			// If fields.theme is unexpectedly absent, consider it as "none".
			if ( !fields.theme ) {
				fields.theme = "none";
			}
			if ( fields.theme !== "none" ) {
				themeVars = querystring.parse( fields.theme );
			}
			if ( themeVars !== null ) {

				// Override with fields if they exist.
				themeVars.folderName = fields[ "theme-folder-name" ] || themeVars.folderName;
				themeVars.scope = fields.scope || themeVars.scope;
			}
			components = Object
				.keys( fields )
				.filter( key => ![
					"scope",
					"theme",
					"theme-folder-name",
					"version"
				].includes( key ) );
			jqueryUi = JqueryUi.find( fields.version );

			Package = require( "./lib/package" );

			packager = new Packager( jqueryUi.files().cache, Package, {
				components: components,
				themeVars: themeVars,
				jQueryUiVersion: jqueryUi.pkg.version,
				scope: fields.scope
			}, { cache: cache } );
			response.setHeader( "Content-Type", "application/zip" );
			response.setHeader( "Content-Disposition", "attachment; filename=" + packager.pkg.zipFilename );
			packager.toZip( response, {
				basedir: packager.pkg.zipBasedir
			}, function( error ) {
				if ( error ) {
					return callback( error );
				}

				// Log statistics
				var toZip = packager.stats.toZip;

				downloadLogger.info(
					JSON.stringify( {
						build_size: toZip && toZip.hasOwnProperty( "size" ) ? toZip.size : "unknown",
						build_time: packager.stats.build.time + ( toZip && toZip.hasOwnProperty( "time" ) ? toZip.time : 0 ),
						components: components,
						version: jqueryUi.pkg.version
					} )
				);
				return callback();
			} );
		} catch ( err ) {
			return callback( err );
		}
	},

	theme: function( params ) {
		var selectedTheme = themeGallery[ 0 ];
		if ( params.themeParams ) {
			selectedTheme = new ThemeRoller( {
				vars: querystring.parse( params.themeParams )
			} );
		}
		return jsonpTemplate( {
			callback: params.callback,
			data: JSON.stringify( {
				folderName: selectedTheme.folderName(),
				themeGallery: ( selectedTheme.name === "Custom Theme" ?  [ selectedTheme ].concat( themeGallery ) : themeGallery ).map( function( theme ) {
					return {
						isSelected: theme.isEqual( selectedTheme ) ? "selected=\"selected\"" : "",
						name: theme.name,
						serializedVars: theme.serializedVars
					};
				} ),
				themerollerParams: selectedTheme.serializedVars.length > 0 ? "#" + selectedTheme.serializedVars : ""
			} )
		} );
	}
};

module.exports = Frontend;
