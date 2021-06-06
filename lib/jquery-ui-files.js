"use strict";

var commonFiles, componentFiles, flatten, stripBanner, testFiles,
	banner = require( "./banner" ),
	Files = require( "./files" ),
	fs = require( "fs" ),
	JqueryUiFiles_1_9_0 = require( "./jquery-ui-files-1-9" ),
	JqueryUiFiles_1_10_0 = require( "./jquery-ui-files-1-10" ),
	JqueryUiFiles_1_11_0 = require( "./jquery-ui-files-1-11" ),
	JqueryUiFiles_1_12_0 = require( "./jquery-ui-files-1-12" ),
	path = require( "path" ),
	semver = require( "semver" ),
	sqwish = require( "sqwish" ),
	UglifyJS = require( "uglify-js" ),
	util = require( "./util" ),
	filesCache = {};

flatten = util.flatten;
stripBanner = util.stripBanner;

function replaceVersion( data, version ) {
	return data.replace( /@VERSION/g, version );
}

function readFile( path, version ) {
	var data = fs.readFileSync( path );
	if ( ( /(js|css)$/ ).test( path ) ) {
		data = replaceVersion( data.toString( "utf8" ), version );
	}
	return data;
}

/**
 * JqueryUiFiles
 */
function JqueryUiFiles( jqueryUi ) {
	var cache;

	this.cache = cache = filesCache[ jqueryUi.path ] = {};
	this.cache.minified = {};
	this.jqueryUi = jqueryUi;

	this.readFile = function( srcpath ) {
		var destpath = srcpath;
		if ( !cache[ destpath ] ) {
			cache[ destpath ] = {
				path: destpath,
				data: readFile( jqueryUi.path + srcpath, jqueryUi.pkg.version )
			};
		}
		return cache[ destpath ];
	};

	this.stripJqueryUiPath = function( filepath ) {
		return path.relative( jqueryUi.path, filepath );
	};

	if ( semver.gte( jqueryUi.pkg.version, "1.12.0-a" ) ) {
		JqueryUiFiles_1_12_0.apply( this, arguments );
	} else if ( semver.gte( jqueryUi.pkg.version, "1.11.0-a" ) ) {
		JqueryUiFiles_1_11_0.apply( this, arguments );
	} else if ( semver.gte( jqueryUi.pkg.version, "1.10.0" ) ) {
		JqueryUiFiles_1_10_0.apply( this, arguments );
	} else {
		JqueryUiFiles_1_9_0.apply( this, arguments );
	}
}

JqueryUiFiles.prototype = {
	get: function( filepath ) {
		return this.cache[ filepath ];
	},

	min: function( file, options ) {
		var minified = this.cache.minified;
		options = options || {};

		if ( !minified[ file.path ] || options.skipCache ) {
			minified[ file.path ] = {
				path: file.path.replace( /\.([^.]*)$/, ".min.$1" )
			};
			if ( ( /\.js$/i ).test( file.path ) ) {
				minified[ file.path ].data = UglifyJS.minify( file.data.toString( "utf8" ) ).code;
			} else if ( ( /\.css$/i ).test( file.path ) ) {
				minified[ file.path ].data = sqwish.minify( file.data.toString( "utf8" ) );
			}

			// Update banner
			minified[ file.path ].data =
				banner( this.jqueryUi.pkg, null, { minify: true } ) +
				stripBanner( minified[ file.path ] );
		}

		return minified[ file.path ];
	}
};

module.exports = JqueryUiFiles;
