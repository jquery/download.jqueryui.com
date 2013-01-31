var _ = require( "underscore" ),
	async = require( "async" ),
	fs = require( "fs" ),
	im = require( "gm" ).subClass({ imageMagick: true }),
	path = require( "path" );

var cacheDirectory = __dirname + "/../tmp/cache/";

var imageQueue = async.queue( function( task, callback ) {
	task( callback );
}, 4 );


if ( !fs.existsSync( cacheDirectory ) ) {
	fs.mkdirSync( cacheDirectory );
}


// module.exports =
function getImage( params, callback ) {
	// normalize
	params = params || {};

	var cacheFile = cacheDirectory + serialize( params ) + ".cache";

	fs.exists( cacheFile, function( exists ) {
		if ( exists ) {
			fs.readFile( cacheFile, callback );
		} else {
			generateImage( params, function( err, data ) {
				fs.writeFile( cacheFile, data, function() {
					callback( null, data );
				});
			});
		}
	});
}

function generateImage( params, callback ) {
	if ( params.icon ) {
		generateIcon( params, callback );
	} else {
		generateThumbnail( params, callback );
	}
}

function generateIcon( params, callback ) {
	params = params || {};

	if ( !params.color ) {
		throw new Error( "missing color" );
	}

	// Add '#' in the beginning of the colors if needed
	params.color = hashColor( params.color );

	// http://www.imagemagick.org/Usage/masking/#shapes
	// $ convert <icons_mask_filename> -background <color> -alpha shape output.png

	imageQueue.push(function( innerCallback ) {
		im( __dirname + "/../template/themeroller/icon/mask.png" )
			.background( params.color )
			.out( "-alpha", "shape" )
			.stream( "png", stream2Buffer( innerCallback ) );
	}, callback );
};

function generateThumbnail( params, callback ) {
	var filename, missingParams,
		requiredParams = [ "color", "height", "opacity", "type", "width" ];

	params = params || {};
	missingParams = requiredParams.filter(function( param ) {
		return !params[ param ];
	});

	if ( missingParams.length ) {
		throw new Error( "missing \"" + missingParams.join( "\", \"" ) + "\"" );
	}

	// Add '#' in the beginning of the colors if needed
	params.color = hashColor( params.color );

	filename = params.type.replace( /-/g, "_" ).replace( /$/, ".png" );

	// http://www.imagemagick.org/Usage/compose/#dissolve
	// $ convert -size <width>x<height> 'xc:<color>' <texture_filename> -compose dissolve -define compose:args=<opacity>,100 -composite output.png
	imageQueue.push(function( innerCallback ) {
		im( params.width, params.height, params.color )
			.out( __dirname + "/../template/themeroller/texture/" + filename, "-compose", "dissolve", "-define", "compose:args=" + params.opacity + ",100", "-composite" )
			.stream( "png", stream2Buffer( innerCallback ) );
	}, callback );
};

// I don't know if there's a better solution, but without the below conversion to Buffer we're not able to use it.
function stream2Buffer( callback ) {
	return function( err, data ) {
		if ( err ) {
			callback( err );
		} else {
			var chunks = [],
				dataLen = 0;

			data.on( "data", function( chunk ) {
				chunks.push( chunk );
				dataLen += chunk.length;
			});

			data.on( "end", function() {
				var i = 0,
					buffer = new Buffer( dataLen );
				chunks.forEach(function ( chunk ) {
					chunk.copy( buffer, i, 0, chunk.length );
					i += chunk.length;
				});
				callback( null, buffer );
			});

			data.on( "error", function( err ) {
				callback( err );
			});
		}
	};
}
// create a filename from the params
function serialize( params ) {
	var icon = params.icon,
		fields = icon ? [ 
				"color" 
			] : [ 
				"color", "height", "opacity", "type", "width"
			];
	return ( icon ? "icon-" : "" ) + fields.map(function( field ) {
		return String( params[ field ] ).toLowerCase();
	}).join("-");
}

function hashColor( color ) {
		if ( ( color.length === 3 || color.length === 6 ) && /^[0-9a-f]+$/i.test( color ) ) {
			color = "#" + color;
		}
		return color;
}

module.exports = getImage;
