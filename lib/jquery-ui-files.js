"use strict";

var stripBanner, glob, noDirectory,
	banner = require( "./banner" ),
	fs = require( "node:fs" ),
	path = require( "node:path" ),
	sqwish = require( "sqwish" ),
	swc = require( "@swc/core" ),
	swcOptions = require( "./swc-options" ),
	util = require( "./util" ),
	Files = require( "./files" ),
	filesCache = {};

stripBanner = util.stripBanner;
glob = util.glob;
noDirectory = util.noDirectory;

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
	var cache, files;

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

	glob( jqueryUi.path + "!(.*|node_modules|build)" )
		.filter( noDirectory )
		.map( this.stripJqueryUiPath )
		.map( this.readFile );
	glob( jqueryUi.path + "!(.*|node_modules|build)/**" )
		.filter( noDirectory )
		.map( this.stripJqueryUiPath )
		.map( this.readFile );

	this.componentFiles = Files( glob( jqueryUi.path + "ui/**/*.js" )
		.map( this.stripJqueryUiPath )
		.map( this.readFile ) );

	// Convert {path:<path>, data:<data>} into {path: <data>}.
	files = this.cache;
	this.cache = Object.keys( files )
		.reduce( function( _files, filepath ) {
			_files[ filepath ] = files[ filepath ].data;
			return _files;
		}, {} );

	this.baseThemeCss = {
		data: this.get( "themes/base/theme.css" )
	};
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
				minified[ file.path ].data = swc.minifySync(
					file.data.toString( "utf8" ),
					swcOptions
				).code;
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
