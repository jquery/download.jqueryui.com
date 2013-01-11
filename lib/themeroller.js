var _ = require( "underscore" ),
	async = require( "async" ),
	fs = require( "fs" ),
	http = require( "http" ),
	im = require( "gm" ).subClass({ imageMagick: true }),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	querystring = require( "querystring" ),
	Release = require( "./release" ),
	semver = require( "semver" ),
	textures = require( "./themeroller.textures" ),
	zParams = require( "./zparams" );

var themeStaticCss = Release.all().reduce(function( sum, release ) {
	sum[ release.pkg.version ] = fs.readFileSync( release.path + "themes/base/jquery.ui.theme.css", "utf8" );
	return sum;
}, {});

var colorVars = "bgColorActive bgColorContent bgColorDefault bgColorError bgColorHeader bgColorHighlight bgColorHover bgColorOverlay bgColorShadow borderColorActive borderColorContent borderColorDefault borderColorError borderColorHeader borderColorHighlight borderColorHover fcActive fcContent fcDefault fcError fcHeader fcHighlight fcHover iconColorActive iconColorContent iconColorDefault iconColorError iconColorHeader iconColorHighlight iconColorHover".split( " " );

// Hard coded css Y image positioning - context accepts button or panel
function cssYPos( texture, context ){
	var YPos = "50%";
	if( context === "panel" ){
		if( texture === "highlight_soft" || texture === "highlight_hard" || texture === "gloss_wave" ){
			YPos = "top";
		}
		else if( texture === "inset_soft" || texture === "inset_hard" ){
			YPos = "bottom";
		}
		else if( texture === "glow_ball" ){
			YPos = "35%";
		}
		else if( texture === "spotlight" ){
			YPos = "2%";
		}
	}
	return YPos;
}

// Hard coded css X image positioning - context accepts button or panel
function cssXPos( texture, context ){
	var XPos = "50%";
	// No conditions yet, may need some for vertical slider patterns
	return XPos;
}

// Add '#' in the beginning of the colors if needed
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

textures = textures.reduce(function( sum, texture ) {
	sum[ texture.type ] = texture;
	return sum;
}, {});

var iconDimension = [ "256", "240" ];


/**
 * ThemeRoller
 */
function ThemeRoller( options ) {
	var found, opacityFilter, opacityFix, themeGallery, vars, version,
		self = this;
	options = options || {};
	if ( typeof options !== "object" ) {
		throw new Error( "Wrong type `options`" );
	}
	vars = options.vars;
	version = options.version;
	if ( vars === false || vars === null ) {
		this.isNull = true;
		this.vars = {};
		return;
	} else if ( vars ) {
		this._folderName = vars.folderName;
		this.name = vars.name;
		this.scope = vars.scope;
		delete vars.folderName;
		delete vars.name;
		delete vars.scope;
	}
	if ( version ) {
		if ( !Release.find( version ) ) {
			throw new Error( "Invalid release version {version: \"" + version + "\"}. Fix your parameter or your add this release to your config file." );
		} else {
			this.version = version;
		}
	}
	if ( !this.version ) {
		this.version = Release.getStable().pkg.version;
	}
	this.serializedVars = querystring.stringify( vars );
	zParams.zip(vars, function( zipped ) {
		self.zThemeParams = zipped;
	});
	vars = this.vars = _.extend( {}, ThemeRoller.defaults, vars );
	this.images = {};

	// Opacity fix
	// TODO: Remove `filter` style when dropping support for IE8 and earlier.
	vars.opacityOverlayPerc = vars.opacityOverlay;
	vars.opacityShadowPerc = vars.opacityShadow;
	if ( semver.gte( this.version, "1.10.0" ) ) {

		// For version >= 1.10.0, filter has its own separate line and variable name.
		opacityFix = function( opacity ) {
			return ( opacity / 100 ).toString().replace( /^0\./, "." );
		};
		opacityFilter = function( opacity ) {
			return "Alpha(Opacity=" + opacity + ")";
		};
		vars.opacityFilterOverlay = opacityFilter( vars.opacityOverlay );
		vars.opacityFilterShadow = opacityFilter( vars.opacityShadow );
		vars.opacityOverlay = opacityFix( vars.opacityOverlay );
		vars.opacityShadow = opacityFix( vars.opacityShadow );
	} else {

		// For version < 1.10.0, opacity (w3c) and filter (IE) are combined into the same line.
		opacityFix = function( opacity ) {
			return /* w3c */ ( opacity / 100 ).toString().replace( /^0\./, "." ) + /* IE */ ";filter:Alpha(Opacity=" + opacity + ")";
		};
		vars.opacityOverlay = opacityFix( vars.opacityOverlay );
		vars.opacityShadow = opacityFix( vars.opacityShadow );
	}

	// Add '#' in the beginning of the colors if needed
	colorVars.forEach(function( colorVar ) {
		vars[ colorVar ] = hashColor( vars[ colorVar ] );
	});

	// Set hard coded image url
	vars.bgImgUrlActive = this._textureUrl( vars.bgColorActive, vars.bgTextureActive, vars.bgImgOpacityActive );
	vars.bgImgUrlContent = this._textureUrl( vars.bgColorContent, vars.bgTextureContent, vars.bgImgOpacityContent );
	vars.bgImgUrlDefault = this._textureUrl( vars.bgColorDefault, vars.bgTextureDefault, vars.bgImgOpacityDefault );
	vars.bgImgUrlError = this._textureUrl( vars.bgColorError, vars.bgTextureError, vars.bgImgOpacityError );
	vars.bgImgUrlHeader = this._textureUrl( vars.bgColorHeader, vars.bgTextureHeader, vars.bgImgOpacityHeader );
	vars.bgImgUrlHighlight = this._textureUrl( vars.bgColorHighlight, vars.bgTextureHighlight, vars.bgImgOpacityHighlight );
	vars.bgImgUrlHover = this._textureUrl( vars.bgColorHover, vars.bgTextureHover, vars.bgImgOpacityHover );
	vars.bgImgUrlOverlay = this._textureUrl( vars.bgColorOverlay, vars.bgTextureOverlay, vars.bgImgOpacityOverlay );
	vars.bgImgUrlShadow = this._textureUrl( vars.bgColorShadow, vars.bgTextureShadow, vars.bgImgOpacityShadow );
	vars.iconsActive = this._iconUrl( vars.iconColorActive );
	vars.iconsContent = this._iconUrl( vars.iconColorContent );
	vars.iconsDefault = this._iconUrl( vars.iconColorDefault );
	vars.iconsError = this._iconUrl( vars.iconColorError );
	vars.iconsHeader = this._iconUrl( vars.iconColorHeader );
	vars.iconsHighlight = this._iconUrl( vars.iconColorHighlight );
	vars.iconsHover = this._iconUrl( vars.iconColorHover );

	// Set hard coded css image repeats
	vars.bgDefaultRepeat = this._cssRepeat( vars.bgTextureDefault );
	vars.bgHoverRepeat = this._cssRepeat( vars.bgTextureHover );
	vars.bgActiveRepeat = this._cssRepeat( vars.bgTextureActive );
	vars.bgHeaderRepeat = this._cssRepeat( vars.bgTextureHeader );
	vars.bgContentRepeat = this._cssRepeat( vars.bgTextureContent );
	vars.bgHighlightRepeat = this._cssRepeat( vars.bgTextureHighlight );
	vars.bgErrorRepeat = this._cssRepeat( vars.bgTextureError );
	vars.bgOverlayRepeat = this._cssRepeat( vars.bgTextureOverlay );
	vars.bgShadowRepeat = this._cssRepeat( vars.bgTextureShadow );

	// Set hard coded css Y image positioning
	vars.bgDefaultYPos = cssYPos( vars.bgTextureDefault, "button" );
	vars.bgHoverYPos = cssYPos( vars.bgTextureHover, "button" );
	vars.bgActiveYPos = cssYPos( vars.bgTextureActive, "button" );
	vars.bgHeaderYPos = cssYPos( vars.bgTextureHeader, "button" );
	vars.bgContentYPos = cssYPos( vars.bgTextureContent, "panel" );
	vars.bgHighlightYPos = cssYPos( vars.bgTextureHighlight, "panel" );
	vars.bgErrorYPos = cssYPos( vars.bgTextureError, "panel" );
	vars.bgOverlayYPos = cssYPos( vars.bgTextureOverlay, "panel" );
	vars.bgShadowYPos = cssYPos( vars.bgTextureShadow, "panel" );

	// Set hard coded css X image positioning
	vars.bgDefaultXPos = cssXPos( vars.bgTextureDefault, "button" );
	vars.bgHoverXPos = cssXPos( vars.bgTextureHover, "button" );
	vars.bgActiveXPos = cssXPos( vars.bgTextureActive, "button" );
	vars.bgHeaderXPos = cssXPos( vars.bgTextureHeader, "button" );
	vars.bgContentXPos = cssXPos( vars.bgTextureContent, "panel" );
	vars.bgHighlightXPos = cssXPos( vars.bgTextureHighlight, "panel" );
	vars.bgErrorXPos = cssXPos( vars.bgTextureError, "panel" );
	vars.bgOverlayXPos = cssXPos( vars.bgTextureOverlay, "panel" );
	vars.bgShadowXPos = cssXPos( vars.bgTextureShadow, "panel" );

	if ( !this.name ) {
		// Pick name based on theme gallery vs. our vars
		themeGallery = require( "./themeroller.themegallery" );
		themeGallery.some(function( theme ) {
			found = theme.isEqual( self );
			if ( found ) {
				self.name = theme.name;
			}
			return found;
		});
	}
	if ( !this.name ) {
		// Nothing yet? Call it "Custom Theme" then
		this.name = "Custom Theme";
	}

	// This is the fix for when no font-family is specified
	if ( vars.ffDefault === "" || !vars.ffDefault ) {
		vars.ffDefault = "inherit";
	}
}

ThemeRoller.generateIcon = function( params, callback ) {
	params = params || {};

	if ( !params.color ) {
		throw new Error( "missing color" );
	}

	// Add '#' in the beginning of the colors if needed
	params.color = hashColor( params.color );

	// http://www.imagemagick.org/Usage/masking/#shapes
	// $ convert <icons_mask_filename> -background <color> -alpha shape output.png
	im( __dirname + "/../template/themeroller/icon/mask.png" )
		.background( params.color )
		.out( "-alpha", "shape" )
		.stream( "png", stream2Buffer( callback ) );
};

ThemeRoller.generateTexture = function( params, callback ) {
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
	im( params.width, params.height, params.color )
		.out( __dirname + "/../template/themeroller/texture/" + filename, "-compose", "dissolve", "-define", "compose:args=" + params.opacity + ",100", "-composite" )
		.stream( "png", stream2Buffer( callback ) );
};

function expandColor( color ) {
	if ( color.length === 3 ) {
		return [ 0, 0, 1, 1, 2, 2 ].map(function( i ) {
			return color[i];
		}).join( "" );
	}
	return color;
}

ThemeRoller.prototype = {
	_cssRepeat: function( textureType ) {
		var texture = textures[ textureType ];
		if ( typeof texture === "undefined" ) {
			throw new Error( "Texture \"" + textureType + "\" not defined" );
		}
		return texture.repeat;
	},

	_iconUrl: function( color ) {
		var filename;
		color = expandColor( color ).replace( /^#/, "" );

		// ui-icons_<color>_256x240.png
		filename = "ui-icons_" + color + "_256x240.png";

		this._setImage( filename, {
			icon: true,
			color: color
		});
		return this._imageUrl( filename );
	},

	_imageUrl: function( filename ) {
		if ( this.vars.dynamicImage ) {
			return "url(" + this.vars.dynamicImageHost + "/themeroller/images/" + filename + ")";
		} else {
			return "url(images/" + filename + ")";
		}
	},

	_setImage: function( filename, url ) {
		if ( typeof this.images[ filename ] === "undefined" ) {
			this.images[ filename ] = url;
		}
	},

	_textureUrl: function( color, textureType, opacity ) {
		var texture = textures[ textureType ],
			filename;
		if ( typeof texture === "undefined" ) {
			throw new Error( "No dimensions set for texture \"" + textureType + "\"" );
		}
		color = expandColor( color ).replace( /^#/, "" );

		// ui-bg_<type>_<opacity>_<color>_<width>x<height>.png
		filename = "ui-bg_" + textureType.replace( /_/g, "-" ) + "_" + opacity + "_" + color + "_" + texture.width + "x" + texture.height + ".png";

		this._setImage( filename, {
			color: color,
			height: texture.height,
			opacity: opacity,
			texture: true,
			type: texture.type,
			width: texture.width
		});
		return this._imageUrl( filename );
	},

	css: function() {
		if ( this.isNull ) {
			return "";
		}
		if ( !this._css ) {
			var vars = this.vars;
			this._css = themeStaticCss[ this.version ].replace( /[\s]+[\S]+\/\*\{([^\}\*\/]+)\}\*\//g, function( match, p1 ) {
				return " " + vars[ p1 ];
			});
			if ( this.scope ) {
				this._css = this._css.replace( /(\.ui[^\n,]*)/g, this.scope + " $1" );
			}
			if ( this.serializedVars.length > 0 ) {
				// Theme url
				this._css = this._css.replace( /\/themeroller\//, this.url() );
			}
		}
		return this._css;
	},

	generateImages: function( callback ) {
		if ( this.isNull ) {
			callback( null, [] );
			return;
		}
		var self = this;
		async.parallel( Object.keys( this.images ).map(function( filename ) {
			return function( callback ) {
				var fn,
					params = self.images[ filename ];
				if ( params.icon ) {
					fn = ThemeRoller.generateIcon;
				} else {
					fn = ThemeRoller.generateTexture;
				}

				// Generate
				fn( params, function( err, data ) {
					callback( err, {
						path: filename,
						data: data
					});
				});
			};
		}), function( err, results ) {
			if ( err ) {
				err.message = "ThemeRoller#generateImages: " + err.message;
				logger.error( err.message );
			}
			callback( err, results );
		});
	},

	folderName: function() {
		if ( this._folderName ) {
			return this._folderName;
		} else if ( this.name ) {
			return this.name.toLowerCase().replace( /\s/, "-" );
		}
		return this.isNull ?  "no-theme" : "custom-theme";
	},

	isEqual: function( theme ) {
		var self = this;
		return Object.keys( this.vars ).every(function( key ) {
			return self.vars[ key ] === theme.vars[ key ];
		});
	},

	// FIXME make this async
	url: function() {
		var querystring;
		if ( this.zThemeParams && this.zThemeParams.length && this.zThemeParams.length + "zThemeParams=".length < this.serializedVars.length ) {
			querystring = "zThemeParams=" + this.zThemeParams;
		} else {
			querystring = this.serializedVars;
		}
		return "/themeroller/" + ( querystring.length ? "?" + querystring : querystring );
	}
};

ThemeRoller.defaults = require( "./themeroller.defaults" );

module.exports = ThemeRoller;
