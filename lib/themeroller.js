var _ = require( "underscore" ),
	async = require( "async" ),
	config = require( "../config" ),
	fs = require( "fs" ),
	http = require( "http" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	querystring = require( "querystring" ),
	Release = require( "./release" ),
	textures = require( "./themeroller.textures" ),
	zParams = require( "./zparams" );

var themeStaticCss = Release.all().reduce(function( sum, release ) {
	sum[ release.pkg.version ] = fs.readFileSync( release.path + "themes/base/jquery.ui.theme.css", "utf8" );
	return sum;
}, {});

var colorVars = "bgColorActive bgColorContent bgColorDefault bgColorError bgColorHeader bgColorHighlight bgColorHover bgColorOverlay bgColorShadow borderColorActive borderColorContent borderColorDefault borderColorError borderColorHeader borderColorHighlight borderColorHover fcActive fcContent fcDefault fcError fcHeader fcHighlight fcHover".split( " " );

// Hard coded css image repeats - universal to all contexts, depending on on image is designed
function cssRepeat( image ) {
	// Most textures repeat x
	var repeat = "repeat-x";
	// If tile pattern
	if ( "07_diagonals_small.png 07_diagonals_medium.png 08_diagonals_thick.png 09_dots_small.png 10_dots_medium.png 11_white_lines.png 13_diamond.png 14_loop.png 15_carbon_fiber.png 16_diagonal_maze.png 17_diamond_ripple.png 18_hexagon.png 19_layered_circles.png 18_hexagon.png 20_3D_boxes.png 23_fine_grain.png".split( " " ).indexOf( image ) >= 0 ) {
		repeat = "repeat";
	}
	return repeat;
}

// Hard coded css Y image positioning - image is image filename, context accepts button or panel
function cssYPos( image, context ){
	var YPos = "50%";
	if( context === "panel" ){
		if( image === "03_highlight_soft.png" || image === "04_highlight_hard.png" || image === "12_gloss_wave.png" ){
			YPos = "top";
		}
		else if( image === "05_inset_soft.png" || image === "06_inset_hard.png" ){
			YPos = "bottom";
		}
		else if( image === "21_glow_ball.png" ){
			YPos = "35%";
		}
		else if( image === "22_spotlight.png" ){
			YPos = "2%";
		}
	}
	return YPos;
}

// Hard coded css X image positioning - image is image filename, context accepts button or panel
function cssXPos( image, context ){
	var XPos = "50%";
	// No conditions yet, may need some for vertical slider patterns
	return XPos;
}

var textureDimensions = textures.reduce(function( sum, texture ) {
	sum[ texture.file ] = [ texture.width, texture.height ];
	return sum;
}, {});

var iconDimension = [ "256", "240" ];


/**
 * ThemeRoller
 */
function ThemeRoller( vars ) {
	var found, opacityFix, themeGallery,
		self = this;
	if ( vars === false || vars === null ) {
		this.isNull = true;
		this.vars = {};
		return;
	} else if ( vars ) {
		if ( vars.version ) {
			if ( !Release.find( vars.version ) ) {
				throw new Error( "Invalid release version {version: \"" + vars.version + "\"}. Fix your parameter or your add this release to your config file." );
			}
			this.version = vars.version;
			delete vars.version;
		}
		this._folderName = vars.folderName;
		this.name = vars.name;
		this.scope = vars.scope;
		delete vars.folderName;
		delete vars.name;
		delete vars.scope;
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

	// Opacity fix (w3c + IE)
	opacityFix = function( opacity ) {
		return ( /* w3c */ ( opacity === "100" || opacity === "0" ) ? opacity : parseFloat( "." + opacity, 10 ).toString().replace( /^0/, "" ) ) + /* IE */ ";filter:Alpha(Opacity=" + opacity + ")";
	};
	vars.opacityOverlayPerc = vars.opacityOverlay;
	vars.opacityShadowPerc = vars.opacityShadow;
	vars.opacityOverlay = opacityFix( vars.opacityOverlay );
	vars.opacityShadow = opacityFix( vars.opacityShadow );

	// Add '#' in the beginning of the colors if needed
	colorVars.forEach(function( colorVar ) {
		if ( !(/^#/).test( vars[ colorVar ] ) ) {
			vars[ colorVar ] = "#" + vars[ colorVar ];
		}
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
	vars.bgDefaultRepeat = cssRepeat( vars.bgTextureDefault );
	vars.bgHoverRepeat = cssRepeat( vars.bgTextureHover );
	vars.bgActiveRepeat = cssRepeat( vars.bgTextureActive );
	vars.bgHeaderRepeat = cssRepeat( vars.bgTextureHeader );
	vars.bgContentRepeat = cssRepeat( vars.bgTextureContent );
	vars.bgHighlightRepeat = cssRepeat( vars.bgTextureHighlight );
	vars.bgErrorRepeat = cssRepeat( vars.bgTextureError );
	vars.bgOverlayRepeat = cssRepeat( vars.bgTextureOverlay );
	vars.bgShadowRepeat = cssRepeat( vars.bgTextureShadow );

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

function expandColor( color ) {
	if ( color.length === 3 ) {
		return [ 0, 0, 1, 1, 2, 2 ].map(function( i ) {
			return color[i];
		}).join( "" );
	}
	return color;
}

ThemeRoller.prototype = {
	_setImage: function( filename, url ) {
		if ( typeof this.images[ filename ] === "undefined" ) {
			this.images[ filename ] = url;
		}
	},

	_iconUrl: function( color ) {
		var filename;
		color = expandColor( color ).replace( /^#/, "" );
		filename = "ui-icons_" + color + "_256x240.png";
		this._setImage( filename, "?" + querystring.stringify({ "new": color, "w": iconDimension[0], "h": iconDimension[1], "f": "png", "fltr[]": [ "rcd|256", "mask|icons/icons.png" ] }) );
		return this._imageUrl( filename );
	},

	_imageUrl: function( filename ) {
		if ( this.vars.dynamicImage ) {
			return "url(http://" + config.imageGeneratorHost + [ config.imageGeneratorPath, this.images[ filename ] ].join( "/" ) + ")";
		} else {
			return "url(images/" + filename + ")";
		}
	},

	_textureUrl: function( color, file, opacity ) {
		if ( typeof textureDimensions[ file ] === "undefined" ) {
			throw new Error( "No dimensions set for texture \"" + file + "\"" );
		}
		var dimension, filename;
		color = expandColor( color ).replace( /^#/, "" );
		dimension = textureDimensions[ file ];
		filename = "ui-bg_" + file.replace( /[0-9]*_([^\.]*).png/, "$1" ).replace( /_/g, "-" ) + "_" + opacity + "_" + color + "_" + dimension.join( "x" ) + ".png";
		this._setImage( filename, "?" + querystring.stringify({ "new": color, "w": dimension[0], "h": dimension[1], "f": "png", "q": "100", "fltr[]": "over|textures/" + file + "|0|0|" + opacity }) );
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
				// Theme url (needs a shortener)
				this._css = this._css.replace( /\/themeroller\//, "/themeroller/?" + this.serializedVars );
			}
		}
		return this._css;
	},

	fetchImages: function( callback ) {
		if ( this.isNull ) {
			callback( null, [] );
			return;
		}
		var self = this;
		async.parallel( Object.keys( this.images ).map(function( filename ) {
			return function( callback ) {
				http.get({
					host: config.imageGeneratorHost,
					path: [ config.imageGeneratorPath, self.images[ filename ] ].join( "/" )
				}, function( res ) {
					var buffer = [],
						dataLen = 0;
					res.on( "data", function ( chunk ) {
						buffer.push( chunk );
						dataLen += chunk.length;
					});
					res.on( "end", function () {
						var i = 0,
							data = new Buffer( dataLen );
						buffer.forEach(function ( chunk ) {
							chunk.copy( data, i, 0, chunk.length );
							i += chunk.length;
						});
						callback( null, {
							path: filename,
							data: data
						});
					});
				}).on( "error", function( err ) {
					callback( err, null );
				});
			};
		}), function( err, results ) {
			if ( err ) {
				err.message = "ThemeRoller#fetchImages: " + err.message;
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
	}
};

ThemeRoller.defaults = require( "./themeroller.defaults" );

module.exports = ThemeRoller;
