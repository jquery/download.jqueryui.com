var Builder = require( "./build-backend" );

var components = require( "./manifest" ).map(function( component ) {
	return component.name;
});

var out = require( "fs" ).createWriteStream( "result.zip" );
new Builder( components ).writeTo( out, function( error, result ) {
	if ( error ) {
		console.error( "Failure: " + error );
		return;
	}
	console.log( result );
});