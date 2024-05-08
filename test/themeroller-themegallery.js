"use strict";

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

module.exports = {
	"test: cachedZThemeParams in themeGalleryData": {
		"cachedZThemeParams properly computed": function( test ) {
			Promise
				.all( themeGalleryData.map( ( { vars, cachedZThemeParams } ) =>
					new Promise( function( resolve ) {
						zParams.unzip( cachedZThemeParams, ( unzippedVars ) => {
							test.deepEqual(
								unzippedVars,
								omit( vars, [ "name" ] ),
								`Decompressed values should match for theme ${ vars.name }`
							);
							resolve();
						} );
					} )
				) )
				.then( () => {
					test.done();
				} );
		}
	}
};
