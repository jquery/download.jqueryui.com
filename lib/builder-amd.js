/**
 * Generates the JS bundle of an AMD modular project.
 * Ideal for applications that build bundles on the fly using Node.js.
 */

"use strict";

var requirejs = require( "./requirejs-memfiles" ),
	util = require( "util" );

function buildJs( files, config, callback ) {
	var exclude, include;

	if ( typeof config !== "object" ) {
		return callback( new Error( "missing or invalid config (object expected)" ) );
	}
	if ( !Array.isArray( config.include ) ) {
		return callback( new Error( "missing or invalid config.include (array expected)" ) );
	}

	exclude = config.exclude;
	include = config.include;
	delete config.exclude;
	delete config.include;

	config = util._extend( {}, config );
	config.appDir = config.appDir || ".";
	config.baseUrl = config.baseUrl || ".";
	config = util._extend( config, {
		dir: "dist",
		modules: [ {
			name: "output",
			include: include,
			create: true
		} ]
	} );

	if ( exclude ) {
		config.modules[ 0 ].exclude = exclude;
	}

	requirejs.setFiles( files, function( done ) {
		requirejs.optimize( config, function() {
			callback( null, files[ "dist/output.js" ], files );
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
 * @param {Function} callback Function( error, builtJs, files )
 */
module.exports = function( files, config, callback ) {
	var clonedFiles = {};

	// Clone files
	Object.keys( files ).forEach( function( path ) {
		clonedFiles[ path ] = files[ path ];
	} );

	buildJs( clonedFiles, config, callback );
};
