/**
 * Generates the CSS bundle of an AMD modular project that uses the `css!`
 * plugin definitions. It's not a substitute for css plugins like require-css;
 * it uses require-css (vendored in lib/external/require-css) internally.
 */

"use strict";

var requireCssFiles,
	fs = require( "node:fs" ),
	path = require( "node:path" ),
	requirejs = require( "./requirejs-memfiles" );

var requireCssDir = __dirname + "/external/require-css";

requireCssFiles = {
	"require-css/css-builder.js": fs.readFileSync( requireCssDir + "/css-builder.js" ),
	"require-css/css.js": fs.readFileSync( requireCssDir + "/css.js" ),
	"require-css/normalize.js": fs.readFileSync( requireCssDir + "/normalize.js" )
};

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

	config = Object.assign( {}, config );
	config.appDir = config.appDir || ".";
	config.baseUrl = config.baseUrl || ".";
	config.paths = config.paths || {};
	config.paths[ "require-css" ] = path.relative( config.appDir, "require-css" );
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
	config = Object.assign( config, {
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
