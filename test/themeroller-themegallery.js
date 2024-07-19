"use strict";

QUnit.module( "themeroller-themegallery" );

const zParams = require( "../lib/zparams" );
const { themeGalleryData } = require( "../lib/themeroller-themegallery" );

function omit( obj, keys ) {
	let key;
	const copy = Object.create( null );
	for ( key in obj ) {
		if ( !keys.includes( key ) ) {
			copy[ key ] = obj[ key ];
		}
	}
	return copy;
}

QUnit.test( "cachedZThemeParams in themeGalleryData", function( assert ) {
	assert.expect( themeGalleryData.length );

	return Promise
		.all( themeGalleryData.map( ( { vars, cachedZThemeParams } ) =>
			new Promise( function( resolve ) {
				zParams.unzip( cachedZThemeParams, ( unzippedVars ) => {
					assert.deepEqual(
						unzippedVars,
						omit( vars, [ "name" ] ),
						`Decompressed values match for theme ${ vars.name }`
					);
					resolve();
				} );
			} )
		) );
} );
