var cache, imVersion,
	_ = require( "underscore" ),
	async = require( "async" ),
	Cache = require( "./cache" ),
	im = require( "gm" ).subClass({ imageMagick: true }),
	semver = require( "semver" ),
	dimensionLimit = 3000,
	namedColors = require( "./themeroller-colors" );

cache = new Cache( "Image Cache" );

function expandColor( color ) {
	if ( color.length === 3 && /^[0-9a-f]+$/i.test( color ) ) {
		return [ 0, 0, 1, 1, 2, 2 ].map(function( i ) {
			return color[ i ];
		}).join( "" );
	}
	return color;
}

function hashColor( color ) {
		if ( ( color.length === 3 || color.length === 6 ) && /^[0-9a-f]+$/i.test( color ) ) {
			color = "#" + color;
		}
		return color;
}

// I don't know if there's a better solution, but without the below conversion to Buffer we're not able to use it.
function stream2Buffer( callback ) {
	return function( err, stdin, stderr ) {
		if ( err ) {
			return callback( err );
		}
		var chunks = [],
			dataLen = 0;
		err = "";

		stdin.on( "data", function( chunk ) {
			chunks.push( chunk );
			dataLen += chunk.length;
		});

		stderr.on( "data", function( chunk ) {
			err += chunk;
		});

		stdin.on( "end", function() {
			var i = 0,
				buffer = new Buffer( dataLen );
			if ( err.length ) {
				return callback( new Error( err ) );
			}
			chunks.forEach(function ( chunk ) {
				chunk.copy( buffer, i, 0, chunk.length );
				i += chunk.length;
			});
			callback( null, buffer );
		});

		stdin.on( "error", function( err ) {
			callback( err );
		});
	};
}

function validateColor( color ) {
	color = color.replace( /^#/, "" );
	if ( ( color.length === 3 || color.length === 6 ) && /^[0-9a-f]+$/i.test( color ) ) {
		// ok
	} else if ( namedColors.indexOf( color.toLowerCase() ) !== -1 ) {
		// ok
	} else {
		throw new Error( "invalid color \"" + color + "\"" );
	}
}

function validateDimension( params, dimensionParams ) {
	var invalidParams = dimensionParams.filter(function( param ) {
		return parseInt( params[ param ], 10 ) > dimensionLimit;
	});

	if ( invalidParams.length ) {
		throw new Error( "dimension bigger than allowed limit " + JSON.stringify( _.pick( params, invalidParams ) ) );
	}
}

function validateInteger( params, integerParams ) {
	var invalidParams = integerParams.filter(function( param ) {
		return isNaN( parseInt( params[ param ], 10 ) ) || (/[^0-9]/).test( params[ param ] );
	});

	if ( invalidParams.length ) {
		throw new Error( "got a non-integer " + JSON.stringify( _.pick( params, invalidParams ) ) );
	}
}

function validateOpacity( opacity ) {
	opacity = parseInt( opacity, 10 );
	if ( !( opacity >= 0 && opacity <= 100 ) ) {
		throw new Error( "invalid opacity \"" + opacity + "\"" );
	}
}

function validatePresence( params, requiredParams ) {
	var missingParams = requiredParams.filter(function( param ) {
		return !params[ param ];
	});

	if ( missingParams.length ) {
		throw new Error( "missing \"" + missingParams.join( "\", \"" ) + "\"" );
	}
}

var generateIcon, generateImage, generateTexture,
	concurrentQueues = 4,
	imageQueue = async.queue( function( task, callback ) {
		task( callback );
	}, concurrentQueues );

generateImage = function( params, callback ) {
	if ( params.icon ) {
		generateIcon( params.icon, callback );
	} else {
		generateTexture( params.texture, callback );
	}
};

generateIcon = function( params, callback ) {
	var color;

	// Add '#' in the beginning of the colors if needed
	color = hashColor( params.color );

	// http://www.imagemagick.org/Usage/masking/#shapes
	// IM 6.7.9 and below:
	// $ convert <icons_mask_filename> -background <color> -alpha shape output.png
	// IM > 6.7.9: (see #132 http://git.io/gfSacg)
	// $ convert <icons_mask_filename> -set colorspace RGB -background <color> -alpha shape -set colorspace sRGB output.png

	imageQueue.push(function( innerCallback ) {
		try {
			if ( semver.gt( imVersion, "6.7.9" ) ) {
				im( __dirname + "/../template/themeroller/icon/mask.png" )
					.out( "-set", "colorspace", "RGB" )
					.background( color )
					.out( "-alpha", "shape" )
					.out( "-set", "colorspace", "sRGB" )
					.stream( "png", stream2Buffer( innerCallback ) );
			} else {
				im( __dirname + "/../template/themeroller/icon/mask.png" )
					.background( color )
					.out( "-alpha", "shape" )
					.stream( "png", stream2Buffer( innerCallback ) );
			}
		} catch( err ) {
			return innerCallback( err );
		}
	}, callback );
};

generateTexture = function( params, callback ) {
	var color, filename;

	// Add '#' in the beginning of the colors if needed
	color = hashColor( params.color );

	filename = params.type.replace( /-/g, "_" ).replace( /$/, ".png" );

	// http://www.imagemagick.org/Usage/compose/#dissolve
	// $ convert -size <width>x<height> 'xc:<color>' <texture_filename> -compose dissolve -define compose:args=<opacity>,100 -composite output.png

	imageQueue.push(function( innerCallback ) {
		try {
			im( params.width, params.height, color )
				.out( __dirname + "/../template/themeroller/texture/" + filename, "-compose", "dissolve", "-define", "compose:args=" + params.opacity + ",100", "-composite" )
				.stream( "png", stream2Buffer( innerCallback ) );
		} catch( err ) {
			return innerCallback( err );
		}
	}, callback );
};


/**
 * Image
 */
function Image( params ) {
	if ( typeof params === "string" ) {
		params = this._parse( params );
	} else {
		params = params || {};
	}

	if ( params.icon ) {
		params.icon = params.icon || {};

		// Validate Icon
		if ( !params.icon.color ) {
			throw new Error( "missing color" );
		}
		validateColor( params.icon.color );

	} else if ( params.texture ) {
		params.texture = params.texture || {};

		// Validate Texture
		validatePresence( params.texture, [ "color", "height", "opacity", "type", "width" ] );
		validateColor( params.texture.color );
		validateInteger( params.texture, [ "height", "opacity", "width" ] );
		validateDimension( params.texture, [ "height", "width" ] );
		validateOpacity( params.texture.opacity );

	} else {
		throw new Error( "invalid parameters ", JSON.stringify( params ) );
	}

	this.params = params;
}

Image.prototype = {
	_parse: function( filename ) {
		var match, params;

		if ( /^ui-icons/i.test( filename ) ) {

			// ui-icons_<color>_256x240.png
			match = filename.match( /^ui-icons_(\w+)_256x240.png$/i );
			if ( match == null ) {
				throw new Error( "Invalid format: " + filename );
			}
			params = {
				icon: { color: match[ 1 ] }
			};

		} else {

			// ui-bg_<type>_<opacity>_<color>_<width>x<height>.png
			match = filename.match( /^ui-bg_([a-z0-9\-]+)_(\w+)_(\w+)_(\d+)x(\d+).png$/i );
			if ( match == null ) {
				throw new Error( "Invalid format: " + filename );
			}
			params = {
				texture: {
					type: match[ 1 ],
					opacity: match[ 2 ],
					color: match[ 3 ],
					width: match[ 4 ],
					height: match[ 5 ]
				}
			};
		}

		return params;
	},

	filename: function() {
		var color, params;
		if ( !this._filename ) {
			if ( this.params.icon ) {
				params = this.params.icon;
				color = expandColor( params.color ).replace( /^#/, "" );

				// ui-icons_<color>_256x240.png
				this._filename = "ui-icons_" + color + "_256x240.png";

			} else {
				params = this.params.texture;
				color = expandColor( params.color ).replace( /^#/, "" );

				// ui-bg_<type>_<opacity>_<color>_<width>x<height>.png
				this._filename = "ui-bg_" + params.type.replace( /_/g, "-" ) + "_" + params.opacity + "_" + color + "_" + params.width + "x" + params.height + ".png";
			}
		}
		return this._filename;
	},

	get: function( callback ) {
		var filename = this.filename(),
			params = this.params,
			cached = cache.get( filename );

		if ( cached ) {

			// if we have data, call the callback, otherwise push ours
			if ( cached.data ) {
				callback( null, filename, cached.data );
			} else {
				cached.callbacks.push( callback );
			}
			return true;
		}

		cached = {
			callbacks: [ callback ]
		};
		cache.set( filename, cached );
		generateImage( params, function( err, data ) {
			var callbacks = cached.callbacks;
			if ( !err ) {
				cached.data = data;
				delete cached.callbacks;
			}
			callbacks.forEach(function( callback ) {
				callback( err, filename, data );
			});
			delete cached.callbacks;
			if ( err ) {
				cache.destroy( filename );
			}
		});
	}
};

// Check the ImageMagick installation using node-gm (in a hacky way).
async.series([
	function( callback ) {
		var wrappedCallback = function( err ) {
			if ( err ) {
				return callback( new Error( "ImageMagick not found.\n" + err.message ) );
			}
			callback();
		};
		try {
			im()._spawn([ "convert", "-version" ], true, wrappedCallback );
		} catch( err ) {
			return wrappedCallback( err );
		}
	},
	function( callback ) {
		im()._spawn([ "convert", "-version" ], false, stream2Buffer(function( err, buffer ) {
			var output = buffer.toString( "utf8" );
			if ( !(/ImageMagick/).test( output ) ) {
				return callback( new Error( "ImageMagick not installed.\n" + output ) );
			}
			imVersion = output.split( "\n" )[ 0 ].replace( /^Version: ImageMagick ([^ ]*).*/, "$1" );
			if ( !semver.valid( imVersion ) ) {
				return callback( new Error( "Could not identify ImageMagick version.\n" + output ) );
			}
			callback();
		}));
	}
], function( err ) {
	if ( err ) {
		// On error, abort
		throw new Error( err );
	}
});

module.exports = Image;
