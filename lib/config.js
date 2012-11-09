var fs = require( "fs" ),
	path = require( "path" ),
	config;

module.exports = config = JSON.parse( fs.readFileSync( path.join( __dirname, "../config.json" ) ) );

// Validate imageGenerator*
if ( config.imageGeneratorHost == null ) {
	throw new Error( "Missing imageGeneratorHost in config.json" );
}
if ( config.imageGeneratorPath == null ) {
	throw new Error( "Missing imageGeneratorPath in config.json" );
}

// Validate jqueryUi
if ( config.jqueryUi == null ) {
	throw new Error( "Missing jqueryUi branch/tag in config.json" );
}
if ( typeof config.jqueryUi === "string" ) {
	config.jqueryUi = [ config.jqueryUi ];
}
if ( !Array.isArray( config.jqueryUi ) ) {
	throw new Error( "Invalid jqueryUi branch/tag in config.json" );
}
config.jqueryUi = config.jqueryUi.map(function( entry ) {
	if ( typeof entry === "string" ) {
		entry = { ref: entry };
	}
	if ( typeof entry !== "object" || !entry.ref ) {
		throw new Error( "Invalid jqueryUi entry " + JSON.stringify( entry ) + " in config.json" );
	}
	return entry;
});

// Validate jquery
if ( config.jquery == null ) {
	throw new Error( "Missing jquery version in config.json" );
}
if ( typeof config.jquery !== "string" ) {
	throw new Error( "Invalid jquery version in config.json" );
}
