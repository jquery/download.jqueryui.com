"use strict";

var async = require( "async" ),
	Files = require( "./files" ),
	path = require( "path" ),
	semver = require( "semver" ),
	ThemeGallery = require( "./themeroller-themegallery" ),
	util = require( "./util" );


/**
 * ThemesPacker( builder, options )
 * - builder [ instanceof Builder ]: jQuery UI builder object.
 * - options: details below.
 *
 * options:
 * - includeJs [ Boolean ]: Includes JavaScript files (used at CDN package). Default is false.
 */
function ThemesPacker( builder, options ) {
	this.basedir = "jquery-ui-themes-" + builder.jqueryUi.pkg.version;
	this.builder = builder;
	this.options = options || {};
	this.themeGallery = ThemeGallery( builder.jqueryUi );
}

ThemesPacker.prototype = {

	/**
	 * Generates a build array [ <build-item>, ... ], where
	 * build-item = {
	 *   path: String:package destination filepath,
	 *   data: String/Buffer:the content itself
	 * }
	 */
	pack: function( callback ) {
		var build,
			basedir = this.basedir,
			builder = this.builder,
			options = this.options,
			output = [],
			themeGallery = this.themeGallery,
			add = function( file ) {
				if ( arguments.length === 2 ) {
					file = {
						path: arguments[ 0 ],
						data: arguments[ 1 ]
					};
				}
				output.push( {
					path: path.join( basedir, file.path ),
					data: file.data
				} );
			};

		function _build( callback ) {
			builder.build( function( error, _build ) {
				if ( error ) {
					return callback( error );
				}
				build = _build;
				return callback();
			} );
		}

		function pack( callback ) {

			// AUTHORS.txt, MIT-LICENSE.txt, and package.json.
			build.commonFiles.filter( function( file ) {
				return ( /AUTHORS.txt|MIT-LICENSE.txt|package.json/ ).test( file.path );
			} ).forEach( add );

			if ( options.includeJs ) {

				// "ui/*.js"
				build.componentFiles.filter( function( file ) {
					return ( /^ui\// ).test( file.path );
				} ).forEach( add );

				// "ui/*.min.js"
				build.componentMinFiles.filter( function( file ) {
					return ( /^ui\// ).test( file.path );
				} ).forEach( add );

				// "i18n/*.js"
				build.i18nFiles.rename( /^ui\//, "" ).forEach( add );
				build.i18nMinFiles.rename( /^ui\//, "" ).forEach( add );
				build.bundleI18n.into( "i18n/" ).forEach( add );
				build.bundleI18nMin.into( "i18n/" ).forEach( add );

				build.bundleJs.forEach( add );
				build.bundleJsMin.forEach( add );
			}

			async.mapSeries( themeGallery, function( theme, callback ) {

				// Bundle CSS (and minified)
				build.bundleCss( theme ).into( "themes/" + theme.folderName() + "/" ).forEach( add );
				build.bundleCssMin( theme ).into( "themes/" + theme.folderName() + "/" ).forEach( add );

				// Custom theme files
				if ( semver.gte( build.pkg.version, "1.11.0-a" ) ) {
					add( "themes/" + theme.folderName() + "/theme.css", theme.css() );
				} else {
					add( "themes/" + theme.folderName() + "/jquery.ui.theme.css", theme.css() );
				}

				// Custom theme image files
				var themeImages = Files();
				if ( semver.gte( build.pkg.version, "1.10.0" ) && semver.lt( build.pkg.version, "1.11.1-a" ) ) {
					themeImages.push( {
						path: "animated-overlay.gif",
						data: build.get( "themes/base/images/animated-overlay.gif" ).data
					} );
				}
				theme.generateImages( function( error, imageFiles ) {
					if ( error ) {
						return callback( error, null );
					}
					themeImages.concat( imageFiles ).into( "themes/" + theme.folderName() + "/images/" ).forEach( add );
					return callback();
				} );
			}, function( error ) {
				if ( error ) {
					return callback( error );
				}
				var crypto = require( "crypto" );
				add( {
					path: "MANIFEST",
					data: output.sort( function( a, b ) {
						return a.path.localeCompare( b.path );
					} ).map( function( file ) {
						var md5 = crypto.createHash( "md5" );
						md5.update( file.data );
						return file.path.slice( basedir.length ).replace( /^\//, "" ) + " " + md5.digest( "hex" );
					} ).join( "\n" )
				} );
				return callback();
			} );
		}

		async.series( [
			_build,
			pack
		], function( error ) {
			return callback( error, output );
		} );
	},

	filename: function() {
		return this.basedir + ".zip";
	},

	zipTo: function( target, callback ) {
		this.pack( function( error, files ) {
			if ( error ) {
				return callback( error, null );
			}
			util.createZip( files, target, callback );
		} );
	}
};

module.exports = ThemesPacker;
