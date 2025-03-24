"use strict";

const path = require( "node:path" );
const async = require( "async" );
const spawn = require( "cross-spawn" );
const Cache = require( "./cache" );
const semver = require( "semver" );
const dimensionLimit = 3000;
const namedColors = require( "./themeroller-colors" );

const cache = new Cache( "Image Cache" );

function processImageMagick( args, callback ) {
	const proc = spawn( "magick", args );

	const stdoutBuffers = [];
	const stderrBuffers = [];

	proc.stdout.on( "data", data => stdoutBuffers.push( data ) );
	proc.stderr.on( "data", data => stderrBuffers.push( data ) );

	proc.on( "close", code => {
		if ( code !== 0 ) {
			return callback( new Error( `magick process exited with code ${ code }: ${ Buffer.concat( stderrBuffers ).toString() }` ) );
		}
		callback( null, Buffer.concat( stdoutBuffers ) );
	} );

	proc.on( "error", callback );
}

function expandColor( color ) {
	if ( color.length === 3 && /^[0-9a-f]+$/i.test( color ) ) {
		return [ 0, 0, 1, 1, 2, 2 ].map( function( i ) {
			return color[ i ];
		} ).join( "" );
	}
	return color;
}

function hashColor( color ) {
		if ( ( color.length === 3 || color.length === 6 ) && /^[0-9a-f]+$/i.test( color ) ) {
			color = "#" + color;
		}
		return color;
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
	var invalidParams = dimensionParams.filter( function( param ) {
		return parseInt( params[ param ], 10 ) > dimensionLimit;
	} );

	if ( invalidParams.length ) {
		const reportedInvalidParams = Object.create( null );
		for ( const key in invalidParams ) {
			reportedInvalidParams[ key ] = params[ key ];
		}
		throw new Error( "dimension bigger than allowed limit " +
			JSON.stringify( reportedInvalidParams ) );
	}
}

function validateInteger( params, integerParams ) {
	var invalidParams = integerParams.filter( function( param ) {
		return isNaN( parseInt( params[ param ], 10 ) ) || ( /[^0-9]/ ).test( params[ param ] );
	} );

	if ( invalidParams.length ) {
		const reportedInvalidParams = Object.create( null );
		for ( const key in invalidParams ) {
			reportedInvalidParams[ key ] = params[ key ];
		}
		throw new Error( "got a non-integer " +
			JSON.stringify( reportedInvalidParams ) );
	}
}

function validateOpacity( opacity ) {
	opacity = parseInt( opacity, 10 );
	if ( !( opacity >= 0 && opacity <= 100 ) ) {
		throw new Error( "invalid opacity \"" + opacity + "\"" );
	}
}

function validatePresence( params, requiredParams ) {
	var missingParams = requiredParams.filter( function( param ) {
		return !params[ param ];
	} );

	if ( missingParams.length ) {
		throw new Error( "missing \"" + missingParams.join( "\", \"" ) + "\"" );
	}
}

var generateIcon, generateImage, generateTexture,
	concurrentQueues = 4,
	imageQueue = async.queue( function( task, callback ) {
		task( callback );
	}, concurrentQueues );

// We'll `resume()` it once we know the ImageMagic version.
imageQueue.pause();

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

	// https://usage.imagemagick.org/masking/#shapes
	// See https://github.com/jquery/download.jqueryui.com/issues/132 for why
	// * `-set colorspace RGB` is needed (twice) in IM >6.7.9.
	// * `-channel A -gamma 0.5` is needed so that partially transparent
	// pixels are not too dark.
	// Full command:
	// $ magick <icons_mask_filename> -set colorspace RGB -background <color> -alpha shape -channel A -gamma 0.5 -set colorspace sRGB output.png

	imageQueue.push( function( innerCallback ) {
		try {
			processImageMagick( [
				path.join( __dirname, "/../template/themeroller/icon/mask.png" ),
				"-set", "colorspace", "RGB",
				"-background", color,
				"-alpha", "shape",
				"-channel", "A", "-gamma", "0.45",
				"-set", "colorspace", "sRGB",
				"png:-"
			], innerCallback );
		} catch ( err ) {
			return innerCallback( err );
		}
	}, callback );
};

generateTexture = function( params, callback ) {
	var color, filename;

	// Add '#' in the beginning of the colors if needed
	color = hashColor( params.color );

	filename = params.type.replace( /-/g, "_" ).replace( /$/, ".png" );

	// https://usage.imagemagick.org/compose/#dissolve
	// $ magick -size <width>x<height> 'xc:<color>' <texture_filename> -compose dissolve -define compose:args=<opacity>,100 -composite output.png

	imageQueue.push( function( innerCallback ) {
		try {
			processImageMagick( [
				"-size", `${ params.width }x${ params.height }`,
				"canvas:" + color,
				path.join( __dirname, "/../template/themeroller/texture/", filename ),
				"-compose", "dissolve",
				"-define", `compose:args=${ params.opacity },100`,
				"-composite",
				"png:-"
			], innerCallback );
		} catch ( err ) {
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
			callbacks.forEach( function( callback ) {
				callback( err, filename, data );
			} );
			delete cached.callbacks;
			if ( err ) {
				cache.destroy( filename );
			}
		} );
	}
};

// Check the ImageMagick installation.
async.series( [
	function( callback ) {
		var wrappedCallback = function( err ) {
			if ( err ) {
				return callback( new Error( "ImageMagick not found.\n" + err.message ) );
			}
			callback();
		};
		try {
			processImageMagick( [ "-version" ], wrappedCallback );
		} catch ( err ) {
			return wrappedCallback( err );
		}
	},
	function( callback ) {
		processImageMagick( [ "-version" ], function( err, buffer ) {
			if ( err ) {
				return callback( err );
			}
			var output = buffer.toString( "utf8" );
			if ( !( /ImageMagick/ ).test( output ) ) {
				return callback( new Error( "ImageMagick not installed.\n" + output ) );
			}
			const imVersion = output.split( /\r?\n/ )[ 0 ].replace( /^Version: ImageMagick ([^ ]*).*/, "$1" );
			if ( !semver.valid( imVersion ) ) {
				return callback( new Error( "Could not identify ImageMagick version.\n" + output ) );
			}
			imageQueue.resume();
			callback();
		} );
	}
], function( err ) {
	if ( err ) {

		// On error, abort
		throw new Error( err );
	}
} );

module.exports = Image;
