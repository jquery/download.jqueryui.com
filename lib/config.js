var Config, jqueryUi,
	fs = require( "fs" ),
	path = require( "path" );

Config = module.exports = function() {
	var config = Config.get();

	// Validate jqueryUi, eg:
	//   "jqueryUi": {
	//     "stable": {  // required
	//       "version": "1.10.0"
	//       "dependsOn": "jQuery 1.7+"
	//     },
	//     "legacy": {  // optional
	//       "version": "1.9.1"
	//       "dependsOn": "jQuery 1.6+"
	//     }
	//   }
	if ( config.jqueryUi == null ) {
		throw new Error( "Missing jqueryUi branch/tag in config.json" );
	}
	if ( typeof config.jqueryUi !== "object" ) {
		throw new Error( "Invalid jqueryUi branch/tag in config.json" );
	}
	if ( config.jqueryUi.stable == null ) {
		throw new Error( "Missing \"stable\" jqueryUi branch/tag in config.json" );
	}
	// Normalizing jqueryUi object into an Array
	jqueryUi = [ config.jqueryUi.stable ];
	jqueryUi[ 0 ].stable = true;
	if ( config.jqueryUi.legacy ) {
		jqueryUi.push( config.jqueryUi.legacy );
	}
	config.jqueryUi = jqueryUi.map(function( entry ) {
		if ( typeof entry !== "object" || !entry.version ) {
			throw new Error( "Invalid jqueryUi entry " + JSON.stringify( entry ) + " in config.json" );
		}
		entry.ref = entry.version;
		return entry;
	});

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
