var colorVars, iconDimension, textureVars, themeStaticCss,
	_ = require( "underscore" ),
	async = require( "async" ),
	fs = require( "fs" ),
	http = require( "http" ),
	Image = require( "./themeroller-image" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	querystring = require( "querystring" ),
	JqueryUi = require( "./jquery-ui" ),
	semver = require( "semver" ),
	textures = require( "./themeroller-textures" ),
	util = require( "./util" ),
	zParams = require( "./zparams" );

colorVars = "bgColorActive bgColorContent bgColorDefault bgColorError bgColorHeader bgColorHighlight bgColorHover bgColorOverlay bgColorShadow borderColorActive borderColorContent borderColorDefault borderColorError borderColorHeader borderColorHighlight borderColorHover fcActive fcContent fcDefault fcError fcHeader fcHighlight fcHover iconColorActive iconColorContent iconColorDefault iconColorError iconColorHeader iconColorHighlight iconColorHover".split( " " );
textureVars = "bgTextureDefault bgTextureHover bgTextureActive bgTextureHeader bgTextureContent bgTextureHighlight bgTextureError bgTextureOverlay bgTextureShadow".split( " " );
themeStaticCss = {};

// Hard coded css Y image positioning - context accepts button or panel
function cssYPos( texture, context ){
	var YPos;
	if ( texture === "flat" ) {
		return "";
	}
	YPos = "50%";
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
	if ( texture === "flat" ) {
		return "";
	}
	// No conditions yet, may need some for vertical slider patterns.
	// XPos = "50%";
	return "50%";
}

// Add '#' in the beginning of the colors if needed
function hashColor( color ) {
		if ( ( color.length === 3 || color.length === 6 ) && /^[0-9a-f]+$/i.test( color ) ) {
			color = "#" + color;
		}
		return color;
}

// Update textureVars from previous filename format (eg. 02_glass.png) to type-only format (eg. glass). Changed on images generation rewrite (port to nodejs).
function oldImagesBackCompat( vars ) {
	textureVars.forEach(function( textureVar ) {
		var newValue, pair, value;
		if ( textureVar in vars ) {
			value = vars[ textureVar ];
			newValue = value.replace( /[0-9]*_([^\.]*).png/, "$1" );
			if ( value !== newValue ) {
				vars[ textureVar ] = newValue;
			}
		}
	});
}

textures = textures.reduce(function( sum, texture ) {
	sum[ texture.type ] = texture;
	return sum;
}, {});

iconDimension = [ "256", "240" ];


/**
 * ThemeRoller
 */
function ThemeRoller( options ) {
	var found, opacityFilter, opacityFix, themeGallery, vars,
		self = this;
	options = options || {};
	if ( typeof options !== "object" ) {
		throw new Error( "Wrong type `options`" );
	}
	vars = options.vars;
	if ( vars === false || vars === null ) {
		this.isNull = true;
		this.vars = {};
		return;
	} else if ( vars ) {
		vars = _.clone( vars );
		this._folderName = vars.folderName;
		this.name = vars.name;
		this.scope = vars.scope;
		delete vars.folderName;
		delete vars.name;
		delete vars.scope;
	}
	if ( vars && vars.zThemeParams ) {
		throw new Error( "vars.zThemeParams unsupported at the moment. Unzipped vars only. (or need to make ThemeRoller async)" );
	}
	if ( options.jqueryUi instanceof JqueryUi ) {
		this.jqueryUi = options.jqueryUi;
	} else if ( options.version ) {
		this.jqueryUi = JqueryUi.find( options.version );
		if ( !this.jqueryUi ) {
			throw new Error( "Invalid jqueryUi version {version: \"" + options.version + "\"}. Fix your parameter or your add this jqueryUi to your config file." );
		}
	}
	if ( !this.jqueryUi ) {
		this.jqueryUi = JqueryUi.getStable();
	}
	oldImagesBackCompat( vars || {} );
	this.serializedVars = querystring.stringify( vars );
	vars = this.vars = _.extend( {}, ThemeRoller.defaults, vars );
	this.images = [];

	// Opacity fix
	// TODO: Remove `filter` style when dropping support for IE8 and earlier.
	vars.opacityOverlayPerc = vars.opacityOverlay;
	vars.opacityShadowPerc = vars.opacityShadow;
	if ( semver.gte( this.jqueryUi.pkg.version, "1.10.0" ) ) {

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
		themeGallery = require( "./themeroller-themegallery" )();
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

ThemeRoller.prototype = {
	_cssRepeat: function( textureType ) {
		var texture;
		if ( textureType === "flat" ) {
			return "";
		}
		texture = textures[ textureType ];
		if ( typeof texture === "undefined" ) {
			throw new Error( "Texture \"" + textureType + "\" not defined" );
		}
		return texture.repeat;
	},

	_iconUrl: function( color ) {
		var image = new Image({
			icon: { color: color }
		});
		this.images.push( image );
		return this._imageUrl( image.filename() );
	},

	_imageUrl: function( filename ) {
		if ( this.vars.dynamicImage ) {
			return "url(\"" + this.vars.dynamicImageHost + "/themeroller/images/" + filename + "\")";
		} else {
			return "url(\"images/" + filename + "\")";
		}
	},

	_textureUrl: function( color, textureType, opacity ) {
		var image, texture;
		if ( textureType === "flat" ) {
			return "";
		}
		texture = textures[ textureType ];
		if ( typeof texture === "undefined" ) {
			throw new Error( "No dimensions set for texture \"" + textureType + "\"" );
		}
		image = new Image({
			texture: {
				color: color,
				height: texture.height,
				opacity: opacity,
				texture: true,
				type: texture.type,
				width: texture.width
			}
		});
		this.images.push( image );
		return this._imageUrl( image.filename() );
	},

	css: function() {
		if ( this.isNull ) {
			return "";
		}
		if ( !themeStaticCss[ this.jqueryUi.pkg.version ] ) {
			themeStaticCss[ this.jqueryUi.pkg.version ] = this.jqueryUi.files().baseThemeCss.data;
		}
		if ( !this._css ) {
			var vars = this.vars;
			this._css = themeStaticCss[ this.jqueryUi.pkg.version ].replace( /([\s]+[\S]+| )\/\*\{([^\}\*\/]+)\}\*\//g, function( match, g1, p1 ) {
				return " " + vars[ p1 ];
			}).replace( /[\s]+;/g, ";" );
			if ( this.scope ) {
				this._css = util.scope( this._css, this.scope );
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
		var self = this,
			generated = {};
		async.parallel( this.images.map(function( image ) {
			return function( callback ) {
				image.get(function( err, filename, data ) {
					if ( generated[ filename ] ) {
						return callback();
					}
					generated[ filename ] = true;
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
			} else {
				results = results.filter(function( file ) {
					// Skip duplicate images (empty result in here)
					return file && file.path && file.data;
				});
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

	url: function() {
		var querystring = this.serializedVars;
		return "/themeroller/" + ( querystring.length ? "?" + querystring : querystring );
	},

	zThemeParams: function( callback ) {
		zParams.zip( this.vars, callback );
	}
};

ThemeRoller.defaults = require( "./themeroller-defaults" );

module.exports = ThemeRoller;
