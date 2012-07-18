var Builder = require( "./build-backend" );

var components = require( "./manifest" ).components().map(function( component ) {
	return component.name;
});

// specify any additional arguments to include only a subset of components
if (process.argv.length > 2) {
	components = components.slice(0, 10);
}

var out = require( "fs" ).createWriteStream( "result.zip" );
new Builder( components ).writeTo( out, function( error, result ) {
	if ( error ) {
		console.error( "Failure: " + error );
		return;
	}
	console.log( result );
});