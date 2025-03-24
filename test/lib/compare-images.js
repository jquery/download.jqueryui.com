"use strict";

const fs = require( "node:fs" );
const PNG = require( "pngjs" ).PNG;

function compareParsedImages( imgA, imgE, delta = 0 ) {

	// Ensure both images have the same dimensions
	if ( imgA.width !== imgE.width || imgA.height !== imgE.height ) {
		console.error( "Error: Images have different dimensions!" );
		return;
	}

	// Loop over every pixel (each pixel occupies 4 positions in the data array)
	for ( let y = 0; y < imgA.height; y++ ) {
		for ( let x = 0; x < imgA.width; x++ ) {

			// Calculate the starting index for this pixel in the buffer using multiplication
			const i = ( imgA.width * y + x ) * 4;
			const rgbaA = {
				r: imgA.data[ i ],
				g: imgA.data[ i + 1 ],
				b: imgA.data[ i + 2 ],
				alpha: imgA.data[ i + 3 ]
			};
			const rgbaE = {
				r: imgE.data[ i ],
				g: imgE.data[ i + 1 ],
				b: imgE.data[ i + 2 ],
				alpha: imgE.data[ i + 3 ]
			};
			const rDiff = Math.abs( rgbaA.r - rgbaE.r );
			const gDiff = Math.abs( rgbaA.g - rgbaE.g );
			const bDiff = Math.abs( rgbaA.b - rgbaE.b );
			const alphaDiff = Math.abs( rgbaA.alpha - rgbaE.alpha );

			if ( rDiff > delta || gDiff > delta || bDiff > delta || alphaDiff > delta ) {
				console.error( `Error at pixel (x: ${ x }, y: ${ y }): ` +
					`Image actual: rgba(${ rgbaA.r }, ${ rgbaA.g }, ${ rgbaA.b }, ${ rgbaA.alpha }) vs. ` +
					`Image expected: rgba(${ rgbaE.r }, ${ rgbaE.g }, ${ rgbaE.b }, ${ rgbaE.alpha })` );
				return false;
			}
		}
	}

	return true;
}

async function compareImages( pathActual, pathExpected, delta = 0 ) {
	return new Promise( async( resolve, reject ) => {
		const bufferActual = fs.readFileSync( pathActual );
		const bufferExpected = fs.readFileSync( pathExpected );
		const [ imgActual, imgExpected ] = await Promise
			.all(
				[
					bufferActual,
					bufferExpected
				].map( buffer => new Promise( ( res ) => {
					new PNG( { filterType: 4 } )
						.parse( buffer, function( error, img ) {
							if ( error ) {
								reject( error );
								return;
							}
							res( img );
						} );
					}
				) )
			);

		resolve( compareParsedImages( imgActual, imgExpected, delta ) );
	} );
}

module.exports = { compareImages };
