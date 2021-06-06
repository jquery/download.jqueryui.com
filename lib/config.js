"use strict";

var Config, jqueryUi,
	fs = require( "fs" ),
	path = require( "path" );

Config = module.exports = function() {
	var config = Config.get();

	// Validate jqueryUi, eg:
	//   "jqueryUi": [
	//     {
	//       "version": "1.10.0",
	//       "dependsOn": "jQuery 1.7+",
	//       "stable": true
	//     },
	//     {
	//       "version": "1.9.1",
	//       "dependsOn": "jQuery 1.6+"
	//     }
	//   ]
	if ( config.jqueryUi == null ) {
		throw new Error( "Missing jqueryUi branch/tag in config.json" );
	}
	if ( !Array.isArray( config.jqueryUi ) ) {
		throw new Error( "Invalid jqueryUi branch/tag in config.json" );
	}
	config.jqueryUi = config.jqueryUi.map( function( entry ) {
		if ( typeof entry !== "object" || !entry.version ) {
			throw new Error( "Invalid jqueryUi entry " + JSON.stringify( entry ) + " in config.json" );
		}
		entry.ref = entry.version;
		return entry;
	} );

	// Validate jquery
	if ( config.jquery == null ) {
		throw new Error( "Missing jquery version in config.json" );
	}
	if ( typeof config.jquery !== "string" ) {
		throw new Error( "Invalid jquery version in config.json" );
	}

	return config;
};

Config.get = function() {
	return JSON.parse( fs.readFileSync( path.join( __dirname, "../config.json" ) ) );
};
