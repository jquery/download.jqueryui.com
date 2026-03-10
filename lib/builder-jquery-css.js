/**
 * Generates the CSS bundle of a jQuery project that uses JS comments like
 * `//>> css.<name>: files` to define its CSS dependencies and that uses AMD
 * definitions to define its JS dependencies.
 */

"use strict";

var amdCssBuilder = require( "./builder-amd-css" );

function cssDependencies( data, which ) {
	var result = [],
		regexp = new RegExp( "\\/\\/>>\\s*css\\." + which + ":(.*)", "g" );

	data.replace( regexp, function( garbage, input ) {
		input = input.split( "," ).map( trim );
		result.push.apply( result, input );
	} );

	return result.map( function( cssDependency ) {
		return "\"css!" + cssDependency.replace( /\.css$/i, "" ) + "\"";
	} );
}

function jsDependencies( data ) {
	var match = data.match( /define\(\ ?\[([^\]]*?)\]/ );
	if ( match === null ) {
		return [];
	}
	return match[ 1 ].replace( /\/\/.+/g, "" ).split( "," ).map( trim );
}

/**
 * transform( data, which )
 *
 * @data [String] File content.
 *
 * @which [String] The name of the css bundle selector.
 *
 * Parse the syntax (a) and transform it into the AMD definition (b).
 *
 * a: //>> css.<which>: cssFile1, cssFile2, ...
 *    define([ "foo", "bar" ], function() { ... });
 *
 * b: define([ "css!cssFile1", "css!cssFile2", "css!...", "foo", "bar" ]);
 */
function transform( data, which ) {
	var dependencies = [];

	dependencies.push.apply( dependencies, cssDependencies( data, which ) );
	dependencies.push.apply( dependencies, jsDependencies( data ) );

	return "define([" + dependencies.join( ", " ) + "]);";
}

// Helper: trim.
function trim( string ) {
	return string.trim();
}

/**
 * transformFiles( files, which )
 *
 * @files [Object]
 *
 * @which [String] The name of the css bundle selector.
 *
 * Transform the content of each file according to `transform()`.
 * The original files Object is preserved intact.
 */
function transformFiles( files, which ) {
	var transformedFiles = {};
	Object.keys( files ).forEach( function( path ) {
		var data;
		if ( /\.js$/.test( path ) ) {
			data = files[ path ].toString( "utf-8" );
			transformedFiles[ path ] = transform( data, which );
		} else if ( /\.css$/.test( path ) ) {
			transformedFiles[ path ] = files[ path ].toString( "utf-8" );
		} else {
			transformedFiles[ path ] = files[ path ];
		}
	} );
	return transformedFiles;
}


/**
 * @param {Object} files Object containing (path, data) key-value pairs.
 * @param {string} which CSS name selector (e.g., "structure", "theme").
 * @param {Object} config require.js build configuration.
 * @param {Function} callback Function( error, builtCss, files )
 */
module.exports = function( files, which, config, callback ) {
	try {
		var transformedFiles = transformFiles( files, which );
		amdCssBuilder( transformedFiles, config, callback );
	} catch ( error ) {
		callback( error );
	}
};
