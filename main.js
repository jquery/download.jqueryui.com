var Main,
	_ = require( "underscore" ),
	Config = require( "./lib/config" );

/**
 * Main( options ) -- or require( "download.jqueryui.com" )( options )
 * - options [ Object ]: key-value pairs detailed below.
 *
 * options
 * - config [ Object ]: optional, if present used instead of the `config.json` file;
 * - env [ String ]: optional, specify whether in development or production environment. Default: "development".
 * - host [ String ]: optional, specify the host where download.jqueryui.com server is running. Default: "" (empty string).
 *
 * attributes
 * - frontend [ Object ]: for more details see `frontend.js`.
 *
 */
module.exports = function( options ) {
	return new Main( options );
};

Main = function( options ) {
	options = _.extend( {}, Main.defaults, options );
	if ( options.config && typeof options.config === "object" ) {
		Config.get = function() {
			return options.config;
		};
	}
	this.frontend = new ( require( "./frontend" ) )( options );
};

Main.defaults = {
	env: "development",
	host: ""
};

Main.prototype = {

	/**
	 * Main#buildThemesBundle( callback )
	 * - callback( err, bundleFiles ): bundleFiles is an Array of { path:<path>, data:<data> }'s.
	 *
	 * Generates the theme bundle with base and all themes from themegallery.
	 */
	buildThemesBundle: function( callback ) {
		var allComponents, release, success,
			async = require( "async" ),
			Builder = require( "./lib/builder" ),
			bundleFiles = [],
			Release = require( "./lib/release" ),
			themeGallery = require( "./lib/themeroller.themegallery" );

		release = Release.getStable();
		allComponents = release.components().map(function( component ) {
			return component.name;
		});

		async.mapSeries( themeGallery, function( theme, callback ) {
			var builder = new Builder( release, allComponents, theme ),
				folderName = theme.folderName();
			builder.build(function( err, files ) {
				if ( err ) {
					return callback( err );
				}
				// Add theme files.
				files
					// Pick only theme files we need on the bundle.
					.filter(function( file ) {
						var themeCssOnlyRe = new RegExp( "development-bundle/themes/" + folderName + "/jquery.ui.theme.css" ),
							themeDirRe = new RegExp( "css/" + folderName );
						if ( themeCssOnlyRe.test( file.path ) || themeDirRe.test( file.path ) ) {
							return true;
						}
						return false;
					})
					// Convert paths the way bundle needs and add it into bundleFiles.
					.forEach(function( file ) {
						// 1: Remove initial package name eg. "jquery-ui-1.10.0.custom".
						// 2: Make jquery-ui-1.10.0.custom.css into jquery-ui.css, or jquery-ui-1.10.0.custom.min.css into jquery-ui.min.css
						file.path = file.path
							.split( "/" ).slice( 1 ).join( "/" ) /* 1 */
							.replace( /development-bundle\/themes/, "css" )
							.replace( /css/, "themes" )
							.replace( /jquery-ui-.*?(\.min)*\.css/, "jquery-ui$1.css" ); /* 2 */
						bundleFiles.push( file );
					});

				callback( null, files );
			});
		}, function( err ) {
			callback( err, bundleFiles );
		});
	}
};

