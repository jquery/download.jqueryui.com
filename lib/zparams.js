var lzma = require( "lzma" ).LZMA();

module.exports = {
	unzip: function( zipped, callback ) {
		var data,
			intoDec = function( hex ) {
				var dec = parseInt( hex, 16 );
				if ( dec >= 128 ) {
						dec = dec - 256;
				}
				return dec;
			};

		// Split string into an array of hexes
		data = [];
		while( zipped.length ) {
			data.push( zipped.slice( -2 ) );
			zipped = zipped.slice( 0, -2 );
		}
		data = data.reverse();

		lzma.decompress( data.map( intoDec ), function( unzipped ) {
			callback( JSON.parse( unzipped ) );
		});
	},

	zip: function( obj, callback ) {
		var data = JSON.stringify( obj ),
			intoHex = function( byteFF ) {
				var hex;

				if ( byteFF < 0 ) {
						byteFF = byteFF + 256;
				}

				hex = byteFF.toString( 16 );

				// Add leading zero.
				if ( hex.length === 1 ) {
					hex = "0" + hex;
				}

				return hex;
			};
		lzma.compress( data, 0, function( zipped ) {
			callback( zipped.map( intoHex ).join( "" ) );
		});
	}
};
