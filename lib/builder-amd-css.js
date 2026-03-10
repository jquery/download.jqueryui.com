/**
 * Generates the CSS bundle of an AMD modular project that uses the `css!`
 * plugin definitions. It's not a substitute for css plugins like require-css;
 * it uses require-css (vendored in lib/external/require-css) internally.
 */

"use strict";

var requireCssFiles,
	fs = require( "fs" ),
	glob = require( "glob" ),
	path = require( "path" ),
	requirejs = require( "requirejs-memfiles" ),
	util = require( "util" );

requireCssFiles = {};

glob.sync( __dirname + "/bower_components/require-css/**", { nodir: true } ).forEach( function( filepath ) {
	requireCssFiles[ filepath.replace( __dirname, "" ).replace( /^\//, "" ) ] = fs.readFileSync( filepath );
} );

function buildCss( files, config, callback ) {
	var include;

	if ( typeof config !== "object" ) {
		return callback( new Error( "missing or invalid config (object expected)" ) );
	}
	if ( !Array.isArray( config.include ) ) {
		return callback( new Error( "missing or invalid config.include (array expected)" ) );
	}

	include = config.include;
	delete config.include;

	// Include require-css files.
	Object.keys( requireCssFiles ).forEach( function( filepath ) {
		files[ filepath ] = requireCssFiles[ filepath ];
	} );

	function normalizePath( _path ) {
		return path.normalize( _path ).replace( /^\//, "" );
	}

	config = util._extend( {}, config );
	config.appDir = config.appDir || ".";
	config.baseUrl = config.baseUrl || ".";
	config.paths = config.paths || {};
	config.paths[ "require-css" ] = path.relative( config.appDir, "bower_components/require-css" );
	config.map = config.map || {};
	config.map[ "*" ] = config.map[ "*" ] || {};
	config.map[ "*" ].css = "require-css/css";
	config.asReference = {
		saveFile: function( path, data ) {
			path = normalizePath( path );
			files[ path ] = data;
		},
		loadFile: function( path ) {
			var data;
			path = normalizePath( path );
			data = files[ path ];
			if ( config.onCssBuildWrite ) {
				data = config.onCssBuildWrite( path, data );
			}
			return data;
		}
	};
	config.optimizeCss = "none";
	config.separateCSS = true;
	config = util._extend( config, {
		dir: "dist",
		modules: [ {
			name: "output",
			include: include,
			create: true
		} ]
	} );

	requirejs.setFiles( files, function( done ) {
		requirejs.optimize( config, function() {
			callback( null, files[ "dist/output.css" ] || "", files );
			done();
		}, function( error ) {
			callback( error );
			done();
		} );
	} );
}

/**
 * @param {Object} files Object containing (path, data) key-value pairs.
 * @param {Object} config require.js build configuration.
 * @param {Function} callback Function( error, builtCss, files )
 */
module.exports = function( files, config, callback ) {
	var clonedFiles = {};

	try {

		// Clone files + make sure all CSSes are String utf-8.
		Object.keys( files ).forEach( function( path ) {
			if ( /\.css$/i.test( path ) ) {
				clonedFiles[ path ] = files[ path ].toString( "utf-8" );
			} else {
				clonedFiles[ path ] = files[ path ];
			}
		} );

		buildCss( clonedFiles, config, callback );
	} catch ( error ) {
		callback( error );
	}
};
