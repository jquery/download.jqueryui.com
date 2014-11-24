var themeImagesCache,
	async = require( "async" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	semver = require( "semver" ),
	util = require( "util" );

themeImagesCache = {};


/**
 * Packer( builder, theme, options )
 * - builder [ instanceof Builder ]: jQuery UI builder object.
 * - theme [ instanceof ThemeRoller ]: theme object.
 * - options: details below.
 *
 * options:
 * - bundleSuffix [ String ]: Change bundle filename suffix. Default is ".custom".
 *
 * Other options may be available, see Packer 1.10 or 1.11-x.
 */
function Packer( builder, theme, options ) {
	this.options = options = options || {};
	if ( typeof options.bundleSuffix === "undefined" ) {
	 options.bundleSuffix = ".custom";
	}

	this.basedir = "jquery-ui-" + builder.jqueryUi.pkg.version + options.bundleSuffix;
	this.builder = builder;
	this.theme = theme;
	this.themeImagesCache = themeImagesCache;

	if ( semver.gte( this.builder.jqueryUi.pkg.version, "1.12.0-a" ) ) {
		require( "./packer-1-12-0" ).call( this, builder, theme, options );
	} else if ( semver.gte( this.builder.jqueryUi.pkg.version, "1.11.1-a" ) ) {
		require( "./packer-1-11-1" ).call( this, builder, theme, options );
	} else if ( semver.gte( this.builder.jqueryUi.pkg.version, "1.11.0-a" ) ) {
		require( "./packer-1-11-0" ).call( this, builder, theme, options );
	} else {
		require( "./packer-1-10" ).call( this, builder, theme, options );
	}
}

// TODO shall we move it to themeroller.image.js?
Packer.cacheThemeGalleryImages = function() {
	async.forEachSeries( require( "./themeroller-themegallery" )(), function( theme, callback ) {
		theme.generateImages(function( err, imageFiles ) {
			if ( err ) {
				logger.error( "Caching theme images: " + ( err.stack || err ) );
			} else {
				themeImagesCache[ theme.name ] = imageFiles;
				logger.log( "Theme \"" + theme.name + "\" image files cached" );
			}
			callback();
		});
	});
};

util._extend( Packer.prototype, {
	pack: function() {
		throw new Error( "implement me" );
	},

	filename: function() {
		return this.basedir + ".zip";
	},

	zipTo: function( target, callback ) {
		this.pack(function( err, files ) {
			if ( err ) {
				return callback( err, null );
			}
			require( "./util" ).createZip( files, target, callback );
		});
	}
});

module.exports = Packer;
