var _ = require( "underscore" ),
	async = require( "async" ),
	fs = require( "fs" ),
	im = require( "gm" ).subClass({ imageMagick: true }),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	cache = {},
	cacheExpiresTime = 0,
	cacheCronTimeout,
	DIMENSION_LIMIT = 3000,
	NAMED_COLORS = "aliceblue antiquewhite antiquewhite1 antiquewhite2 antiquewhite3 antiquewhite4 aqua aquamarine aquamarine1 aquamarine2 aquamarine3 aquamarine4 azure azure1 azure2 azure3 azure4 beige bisque bisque1 bisque2 bisque3 bisque4 black blanchedalmond blue blue1 blue2 blue3 blue4 blueviolet brown brown1 brown2 brown3 brown4 burlywood burlywood1 burlywood2 burlywood3 burlywood4 cadet blue cadetblue cadetblue1 cadetblue2 cadetblue3 cadetblue4 chartreuse chartreuse1 chartreuse2 chartreuse3 chartreuse4 chocolate chocolate1 chocolate2 chocolate3 chocolate4 coral coral1 coral2 coral3 coral4 cornflowerblue cornsilk cornsilk1 cornsilk2 cornsilk3 cornsilk4 crimson cyan cyan1 cyan2 cyan3 cyan4 darkblue darkcyan darkgoldenrod darkgoldenrod1 darkgoldenrod2 darkgoldenrod3 darkgoldenrod4 darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkolivegreen1 darkolivegreen2 darkolivegreen3 darkolivegreen4 darkorange darkorange1 darkorange2 darkorange3 darkorange4 darkorchid darkorchid1 darkorchid2 darkorchid3 darkorchid4 darkred darksalmon darkseagreen darkseagreen1 darkseagreen2 darkseagreen3 darkseagreen4 darkslateblue darkslategray darkslategray1 darkslategray2 darkslategray3 darkslategray4 darkslategrey darkturquoise darkviolet deeppink deeppink1 deeppink2 deeppink3 deeppink4 deepskyblue deepskyblue1 deepskyblue2 deepskyblue3 deepskyblue4 dimgray dimgrey dodgerblue dodgerblue1 dodgerblue2 dodgerblue3 dodgerblue4 firebrick firebrick1 firebrick2 firebrick3 firebrick4 floralwhite forestgreen fractal fuchsia gainsboro ghostwhite gold gold1 gold2 gold3 gold4 goldenrod goldenrod1 goldenrod2 goldenrod3 goldenrod4 gray gray0 gray1 gray10 gray100 gray11 gray12 gray13 gray14 gray15 gray16 gray17 gray18 gray19 gray2 gray20 gray21 gray22 gray23 gray24 gray25 gray26 gray27 gray28 gray29 gray3 gray30 gray31 gray32 gray33 gray34 gray35 gray36 gray37 gray38 gray39 gray4 gray40 gray41 gray42 gray43 gray44 gray45 gray46 gray47 gray48 gray49 gray5 gray50 gray51 gray52 gray53 gray54 gray55 gray56 gray57 gray58 gray59 gray6 gray60 gray61 gray62 gray63 gray64 gray65 gray66 gray67 gray68 gray69 gray7 gray70 gray71 gray72 gray73 gray74 gray75 gray76 gray77 gray78 gray79 gray8 gray80 gray81 gray82 gray83 gray84 gray85 gray86 gray87 gray88 gray89 gray9 gray90 gray91 gray92 gray93 gray94 gray95 gray96 gray97 gray98 gray99 green green1 green2 green3 green4 greenyellow grey0 grey1 grey10 grey100 grey100 grey11 grey12 grey13 grey14 grey15 grey16 grey17 grey18 grey19 grey2 grey20 grey21 grey22 grey23 grey24 grey25 grey26 grey27 grey28 grey29 grey3 grey30 grey31 grey32 grey33 grey34 grey35 grey36 grey37 grey38 grey39 grey4 grey40 grey41 grey42 grey43 grey44 grey45 grey46 grey47 grey48 grey49 grey5 grey50 grey51 grey52 grey53 grey54 grey55 grey56 grey57 grey58 grey59 grey6 grey60 grey61 grey62 grey63 grey64 grey65 grey66 grey67 grey68 grey69 grey7 grey70 grey71 grey72 grey73 grey74 grey75 grey76 grey77 grey78 grey79 grey8 grey80 grey81 grey82 grey83 grey84 grey85 grey86 grey87 grey88 grey89 grey9 grey90 grey91 grey92 grey93 grey94 grey95 grey96 grey97 grey98 grey99 honeydew honeydew1 honeydew2 honeydew3 honeydew4 hotpink hotpink1 hotpink2 hotpink3 hotpink4 indianred indianred1 indianred2 indianred3 indianred4 indigo ivory ivory1 ivory2 ivory3 ivory4 khaki khaki1 khaki2 khaki3 khaki4 lavender lavenderblush lavenderblush1 lavenderblush2 lavenderblush3 lavenderblush4 lawngreen lemonchiffon lemonchiffon1 lemonchiffon2 lemonchiffon3 lemonchiffon4 lightblue lightblue1 lightblue2 lightblue3 lightblue4 lightcoral lightcyan lightcyan1 lightcyan2 lightcyan3 lightcyan4 lightgoldenrod lightgoldenrod1 lightgoldenrod2 lightgoldenrod3 lightgoldenrod4 lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightpink1 lightpink2 lightpink3 lightpink4 lightsalmon lightsalmon1 lightsalmon2 lightsalmon3 lightsalmon4 lightseagreen lightskyblue lightskyblue1 lightskyblue2 lightskyblue3 lightskyblue4 lightslateblue lightslategray lightslategrey lightsteelblue lightsteelblue1 lightsteelblue2 lightsteelblue3 lightsteelblue4 lightyellow lightyellow1 lightyellow2 lightyellow3 lightyellow4 lime limegreen linen magenta magenta1 magenta2 magenta3 magenta4 maroon maroon maroon1 maroon2 maroon3 maroon4 mediumaquamarine mediumblue mediumforestgreen mediumgoldenrod mediumorchid mediumorchid1 mediumorchid2 mediumorchid3 mediumorchid4 mediumpurple mediumpurple1 mediumpurple2 mediumpurple3 mediumpurple4 mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose mistyrose1 mistyrose2 mistyrose3 mistyrose4 moccasin navajowhite navajowhite1 navajowhite2 navajowhite3 navajowhite4 navy navyblue none oldlace olive olivedrab olivedrab1 olivedrab2 olivedrab3 olivedrab4 opaque orange orange1 orange2 orange3 orange4 orangered orangered1 orangered2 orangered3 orangered4 orchid orchid1 orchid2 orchid3 orchid4 palegoldenrod palegreen palegreen1 palegreen2 palegreen3 palegreen4 paleturquoise paleturquoise1 paleturquoise2 paleturquoise3 paleturquoise4 palevioletred palevioletred1 palevioletred2 palevioletred3 palevioletred4 papayawhip peachpuff peachpuff1 peachpuff2 peachpuff3 peachpuff4 peru pink pink1 pink2 pink3 pink4 plum plum1 plum2 plum3 plum4 powderblue purple purple purple1 purple2 purple3 purple4 red red1 red2 red3 red4 rosybrown rosybrown1 rosybrown2 rosybrown3 rosybrown4 royalblue royalblue1 royalblue2 royalblue3 royalblue4 saddlebrown salmon salmon1 salmon2 salmon3 salmon4 sandybrown seagreen seagreen1 seagreen2 seagreen3 seagreen4 seashell seashell1 seashell2 seashell3 seashell4 sienna sienna1 sienna2 sienna3 sienna4 silver skyblue skyblue1 skyblue2 skyblue3 skyblue4 slateblue slateblue1 slateblue2 slateblue3 slateblue4 slategray slategray1 slategray2 slategray3 slategray4 slategrey snow snow1 snow2 snow3 snow4 springgreen springgreen1 springgreen2 springgreen3 springgreen4 steelblue steelblue1 steelblue2 steelblue3 steelblue4 tan tan1 tan2 tan3 tan4 teal thistle thistle1 thistle2 thistle3 thistle4 tomato tomato1 tomato2 tomato3 tomato4 transparent turquoise turquoise1 turquoise2 turquoise3 turquoise4 violet violetred violetred1 violetred2 violetred3 violetred4 wheat wheat1 wheat2 wheat3 wheat4 white whitesmoke yellow yellow1 yellow2 yellow3 yellow4 yellowgreen".split( " " );

function cacheCron() {
	var filename,
		count = {
			cached: 0,
			deleted: 0
		},
		currentTime = Date.now();

	for ( filename in cache ) {
		count.cached++;
		if ( cache[ filename ].expires < currentTime ) {
			delete cache[ filename ];
			count.deleted++;
		}
	}
	logger.log( "Cache Cleanup:", count );
	cacheCronTimeout = setTimeout( cacheCron, cacheExpiresTime );
}

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
	} else if ( NAMED_COLORS.indexOf( color.toLowerCase() ) !== -1 ) {
		// ok
	} else {
		throw new Error( "invalid color \"" + color + "\"" );
	}
}

function validateDimension( params, dimensionParams ) {
	var invalidParams = dimensionParams.filter(function( param ) {
		return parseInt( params[ param ], 10 ) > DIMENSION_LIMIT;
	});

	if ( invalidParams.length ) {
		throw new Error( "dimension bigger than DIMENSION_LIMIT " + JSON.stringify( _.pick( params, invalidParams ) ) );
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
	// $ convert <icons_mask_filename> -background <color> -alpha shape output.png

	imageQueue.push(function( innerCallback ) {
		try {
			im( __dirname + "/../template/themeroller/icon/mask.png" )
				.background( color )
				.out( "-alpha", "shape" )
				.stream( "png", stream2Buffer( innerCallback ) );
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
	var missingParams, requiredParams;

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

Image.setCacheExpires = function( expiresTime ) {
	cacheExpiresTime = expiresTime;
	clearTimeout( cacheCronTimeout );
	cacheCron();
};

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

		cached = {
			callbacks: [ callback ],
			expires: Date.now() + cacheExpiresTime
		};
		if ( cacheExpiresTime ) {
			cache[ filename ] = cached;
		}
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

// Check the ImageMagick installation using node-gm (in a hack way).
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
			var output = buffer.toString( "utf-8" );
			if ( !(/ImageMagick/).test( output ) ) {
				return callback( new Error( "ImageMagick not installed.\n" + output ) );
			}
			if ( !(/\s6\.6/).test( output ) ) {
				return callback( new Error( "ImageMagick version is incorrect, it's not 6.6.\n" + output ) );
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
