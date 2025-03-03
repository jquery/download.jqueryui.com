"use strict";

const swc = require( "@swc/core" );
const swcOptions = require( "../lib/swc-options" );

module.exports = function( grunt ) {

grunt.registerMultiTask( "minify", async function() {
	const done = this.async();

	for ( const file of this.files ) {
		const contents = file.src
			.map( singleFile => grunt.file.read( singleFile ) )
			.join( "\n" );

		const { code } = await swc.minify( contents, swcOptions );

		grunt.file.write( file.dest, code );

		grunt.log.writeln( `File ${ file.dest } created.` );
	}

	done();
} );

};
