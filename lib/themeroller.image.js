var async = require( "async" ),
	fs = require( "fs" ),
	im = require( "gm" ).subClass({ imageMagick: true }),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	cache = {},
	cacheExpiresTime = 60000 * 60;

function cacheCron() {
	var filename,
		count = {
			cache: 0,
			deleted: 0
		},
		currentTime = Date.now();

	for ( filename in cache ) {
		count.cache++;
		if ( cache[ filename ].expires < currentTime ) {
			delete cache[ filename ];
			count.deleted++;
		}
	}
	logger.log( "Cache Cleanup:", count );
	setTimeout( cacheCron, cacheExpiresTime );
}

function expandColor( color ) {
	if ( color.length === 3 ) {
		return [ 0, 0, 1, 1, 2, 2 ].map(function( i ) {
			return color[i];
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
	return function( err, data ) {
		if ( err ) {
			return callback( err );
		}
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
	};
}

setTimeout( cacheCron, cacheExpiresTime );

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
	// $ convert <icons_mask_filename> -background <color> -alpha shape output.png

	imageQueue.push(function( innerCallback ) {
		im( __dirname + "/../template/themeroller/icon/mask.png" )
			.background( color )
			.out( "-alpha", "shape" )
			.stream( "png", stream2Buffer( innerCallback ) );
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
		im( params.width, params.height, color )
			.out( __dirname + "/../template/themeroller/texture/" + filename, "-compose", "dissolve", "-define", "compose:args=" + params.opacity + ",100", "-composite" )
			.stream( "png", stream2Buffer( innerCallback ) );
	}, callback );
};


/**
 * Image
 */
function Image( params ) {
	var missingParams, requiredParams;

	if ( typeof params === "string" ) {
		params = this._parse( params );
	}

	params = params || {};

	if ( params.icon ) {
		params.icon = params.icon || {};

		// Validate Icon
		if ( !params.icon.color ) {
			throw new Error( "missing color" );
		}

	} else if ( params.texture ) {
		params.texture = params.texture || {};

		// Validate Texture
		requiredParams = [ "color", "height", "opacity", "type", "width" ];

		missingParams = requiredParams.filter(function( param ) {
			return !params.texture[ param ];
		});

		if ( missingParams.length ) {
			throw new Error( "missing \"" + missingParams.join( "\", \"" ) + "\"" );
		}

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
			cached = cache[ filename ];

		if ( cached ) {

			// expire from last access
			cached.expires = Date.now() + cacheExpiresTime;

			// if we have data, call the callback, otherwise push ours
			if ( cached.data ) {
				callback( null, filename, cached.data );
			} else {
				cached.callbacks.push( callback );
			}
			return true;
		}

		cache[ filename ] = cached = {
			callbacks: [ callback ],
			expires: Date.now() + cacheExpiresTime
		};
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
				delete cache[ filename ];
			}
		});
	}
};

module.exports = Image;
