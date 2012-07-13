var Builder = require( "./build-backend" );

var out = require( "fs" ).createWriteStream( "result.zip" );
new Builder( require( "./manifest" ) ).writeTo( out, function( error, result ) {
	if ( error ) {
		console.error( "Failure: " + error );
		return;
	}
	console.log( result );
});