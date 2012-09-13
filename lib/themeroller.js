var _ = require( "underscore" ),
	async = require( "async" ),
	fs = require( "fs" ),
	http = require( "http" ),
  serialize = require( "./util" ).serialize,
	path = require( "path" ),
	release = require( "./release" ).all()[ 0 ],
	textures = require( "./themeroller.textures.js" );

var imageBaseUrl = {
	host: "jqueryui.com",
	path: "/themeroller/images"
};

var themeStaticCss = fs.readFileSync( release.path + "/themes/base/jquery.ui.theme.css", "utf8" );

var colorVars = "bgColorActive bgColorContent bgColorDefault bgColorError bgColorHeader bgColorHighlight bgColorHover bgColorOverlay bgColorShadow borderColorActive borderColorContent borderColorDefault borderColorError borderColorHeader borderColorHighlight borderColorHover fcActive fcContent fcDefault fcError fcHeader fcHighlight fcHover".split( " " );

// Hard coded css image repeats - universal to all contexts, depending on on image is designed
function cssRepeat( image ) {
	// Most textures repeat x
	repeat = "repeat-x";
	// If tile pattern
	if ( "07_diagonals_small.png 07_diagonals_medium.png 08_diagonals_thick.png 09_dots_small.png 10_dots_medium.png 11_white_lines.png 13_diamond.png 14_loop.png 15_carbon_fiber.png 16_diagonal_maze.png 17_diamond_ripple.png 18_hexagon.png 19_layered_circles.png 18_hexagon.png 20_3D_boxes.png 23_fine_grain.png".split( " " ).indexOf( image ) >= 0 ) {
		repeat = "repeat";
	}
	return repeat;
}

// Hard coded css Y image positioning - image is image filename, context accepts button or panel 
function cssYPos( image, context ){
	YPos = "50%";
	if( context == "panel" ){
		if( image == "03_highlight_soft.png" || image == "04_highlight_hard.png" || image == "12_gloss_wave.png" ){
			YPos = "top";
		}
		else if( image == "05_inset_soft.png" || image == "06_inset_hard.png" ){
			YPos = "bottom";
		}
		else if( image == "21_glow_ball.png" ){
			YPos = "35%";
		}
		else if( image == "22_spotlight.png" ){
			YPos = "2%";
		}
	}
	return YPos;
}

// Hard coded css X image positioning - image is image filename, context accepts button or panel 
function cssXPos( image, context ){
	XPos = "50%";
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
	if ( vars === false || vars === null ) {
		this.isNull = true;
		this.vars = {};
		return;
	}
	if ( vars && vars.name ) {
		this.name = vars.name;
		delete vars.name;
	}
  this.serializedVars = serialize( vars );
	vars = this.vars = _.extend( {}, ThemeRoller.defaults, vars );
	this.images = {};

	// Opacity fix (w3c + IE)
	var opacityFix = function( opacity ) {
		return ( /* w3c */ ( opacity == "100" || opacity == "0" ) ? opacity : parseFloat( "." + opacity, 10 ).toString().replace( /^0/, "" ) ) + /* IE */ ";filter:Alpha(Opacity=" + opacity + ")";
	};
	vars.opacityOverlayPerc = vars.opacityOverlay;
	vars.opacityShadowPerc = vars.opacityShadow;
	vars.opacityOverlay = opacityFix( vars.opacityOverlay );
	vars.opacityShadow = opacityFix( vars.opacityShadow );

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

	// Add '#' in the beginning of the colors
	colorVars.forEach(function( colorVar ) {
		vars[ colorVar ] = "#" + vars[ colorVar ];
	});
}

ThemeRoller.prototype = {
	_setImage: function( filename, url ) {
		if ( typeof this.images[ filename ] == "undefined" ) {
			this.images[ filename ] = url;
		}
	},

	_iconUrl: function( color ) {
		var filename = "ui-icons_" + color + "_256x240.png";
		this._setImage( filename, "?" + serialize( [ [ "new", color ], [ "w", iconDimension[0] ], [ "h", iconDimension[1] ], [ "f", "png" ], [ "fltr[]", "rcd|256" ], [ "fltr[]", "mask|icons/icons.png" ] ] ) );
		return this._imageUrl( filename );
	},

	_imageUrl: function( filename ) {
		if ( this.vars.dynamicImage ) {
			return "url(http://" + imageBaseUrl.host + [ imageBaseUrl.path, this.images[ filename ] ].join( "/" ) + ")";
		} else {
			return "url(images/" + filename + ")";
		}
	},

	_textureUrl: function( color, file, opacity ) {
		if ( typeof textureDimensions[ file ] == "undefined" ) {
			throw "No dimensions set for texture \"" + file + "\"";
		}
		var dimension = textureDimensions[ file ],
			filename = "ui-bg_" + file.replace( /[0-9]*_([^\.]*).png/, "$1" ).replace( /_/g, "-" ) + "_" + opacity + "_" + color + "_" + dimension.join( "x" ) + ".png";
		this._setImage( filename, "?" + serialize( [ [ "new", color], [ "w", dimension[0] ], [ "h", dimension[1] ], [ "f", "png"] , [ "q", "100" ], [ "fltr[]", "over|textures/" + file + "|0|0|" + opacity ] ] ) );
		 
		return this._imageUrl( filename );
	},

	css: function() {
		if ( this.isNull ) {
			return "";
		}
		if ( !this._css ) {
			var vars = this.vars;
			this._css = themeStaticCss.replace( /[\s]+[\S]+\/\*\{([^\}\*\/]+)\}\*\//g, function( match, p1 ) {
				return " " + vars[ p1 ];
			});
			if ( this.serializedVars.length > 0 ) {
				this._css = this._css.replace( /\/themeroller\//, "/themeroller/?" + this.serializedVars );
			}
		}
		return this._css;
	},

	fetchImages: function( callback ) {
		if ( this.isNull ) {
			callback( null );
		}
		var self = this;
		async.parallel( Object.keys( this.images ).map(function( filename ) {
			return function( callback ) {
				// TODO catch errors
				http.get({
					host: imageBaseUrl.host,
					path: [ imageBaseUrl.path, self.images[ filename ] ].join( "/" )
				}, function( res ) {
					var buffer = [];
					var dataLen = 0;
					res.on( "data", function ( chunk ) {
						buffer.push( chunk );
						dataLen += chunk.length;
					});
					res.on( "end", function () {
						var i = 0;
						var data = new Buffer( dataLen );
						buffer.forEach(function ( chunk ) {
							chunk.copy( data, i, 0, chunk.length );
							i += chunk.length;
						});
						callback( null, {
							path: filename,
							data: data
						});
					});
				});
			};
		}), function( err, results ) {
			callback( results );
		});
	},

	folderName: function() {
		if ( this.vars.folderName ) {
			return this.vars.folderName;
		} else if ( this.name ) {
			return this.name.toLowerCase().replace( /\s/, "-" );
		}
		return this.isNull ?  "no-theme" : "custom-theme";
	},

	isEqual: function( theme ) {
		var self = this;
		return Object.keys( this.vars ).every(function( key ) {
			return self.vars[ key ] == theme.vars[ key ];
		});
	}
};

// FIXME load it using require()?
ThemeRoller.defaults = JSON.parse( fs.readFileSync( path.join( __dirname, "themeroller.defaults.json" ) ) );

module.exports = ThemeRoller;
