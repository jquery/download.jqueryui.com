var _ = require( "underscore" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	Image = require( "./lib/themeroller.image" ),
	querystring = require( "querystring" ),
	textures = require( "./lib/themeroller.textures" ),
	themeGallery = require( "./lib/themeroller.themegallery" ),
	ThemeRoller = require( "./lib/themeroller" );

function renderImage( filename, response, callback ) {
	new Image( filename ).get(function( err, filename, data ) {
		if ( err ) {
			return callback( err );
		}
		response.setHeader( "Content-Type", "image/png" );
		response.end( data );
		callback();
	});
}

function gimmeGroups() {
}

group: {
	+ below depending of the group
}
groupFont: {
	isFontType: true
	ffDefault: vars.ffDefault
	fsDefault: vars.fsDefault
	options: [{
		name: normal
		type: normal
		selected: " selected" if type == vars.fwDefault
	}, {
		name: bold
		type: bold
		selected: " selected" if type == vars.fwDefault
	}]
}
groupCorner: {
	isCornerType: true
	cornerRadius: vars.cornerRadius
}
groupDefault: {
	isDefaultType: true
	title: [ "Header/Toolbar", "Content", Clickable: default state, Clickable: hover state, Clickable: active state, Highlight ]
	name: [ Header, Content, Default, Hover, Active, Highlight ]
	class: [ ui-widget-header, ui-widget-content, ui-state-default, ui-state-hover, ui-state-active, ui-state-highlight ]
	bgColorName: "bgColor<id>"
	bgColorValue: vars.bgColor<id>
	bgTextureOptions: [{
	== textureOptions vars.bgTextureHeader "false" ==
		type:
		selected:
		widget:
		height:
		name:
	}],
	bgImgOpacityName: bgImgOpacity<id>
	bgImgOpacityValue: vars.bgImgOpacity<id>
	borderColorName: "
	borderColorValue: "
	fcName: "
	fcValue: "
	iconColorName: "
	iconColorValue: "
}
groupModeloverlay: {
	isModaloverlayType: true
}
groupDropshadow: {
	isDropshadowType: true
	bgTextureShadowOptions: [{
		= each textureOptions vars.bgTextureShadow "true" =
		name:
		type:
		selected:
		width:
		height:
	}]
	bgColorShadow: vars.
	bgImgOpacityShadow: vars.
	opacityShadowPerc: vars.
	thicknessShadow: vars.
	offsetTopShadow: vars.
	offsetLeftShadow: vars.
	cornerRadiusShadow: vars.
}

function augmentGroups( groups ) {
	return groups.map(function( group ) {
		// HERE FIXME HERE
	});
}

function rollyourownRenderObject( theme, host ) {
	var vars = theme.vars;
	return {
		themeParams: theme.serializedVars.length > 0 ? "?themeParams=" + querystring.escape( serializedVars ) : "",
		host: host,
		groups: augmentGroups([{
			type: "font",
			ffDefault: vars.ffDefault,
			fsDefault: vars.fsDefault
		}, {
			type: "corner",
			cornerRadius: vars.cornerRadius
		}, {
			type: "default",
			name: "Header",
			bgColorHeader: vars.bgColorHeader,
			bgTextureHeader: vars.bgTextureHeader
			bgImgOpacityHeader: vars.bgImgOpacityHeader,
			borderColorHeader: vars.borderColorHeader,
			fcHeader: vars.fcHeader,
			iconColorHeader: vars.iconColorHeader
		}, {
			type: "default",
			name: "Content",
			bgColorContent: vars.bgColorContent,
			bgTextureContent: vars.bgTextureContent
			bgImgOpacityContent: vars.bgImgOpacityContent,
			borderColorContent: vars.borderColorContent,
			fcContent: vars.fcContent,
			iconColorContent: vars.iconColorContent
		}, {
			type: "default",
			name: "Default",
			bgColorDefault: vars.bgColorDefault,
			bgTextureDefault: vars.bgTextureDefault
			bgImgOpacityDefault: vars.bgImgOpacityDefault,
			borderColorDefault: vars.borderColorDefault,
			fcDefault: vars.fcDefault,
			iconColorDefault: vars.iconColorDefault
		}, {
			type: "default",
			name: "Hover",
			bgColorHover: vars.bgColorHover,
			bgTextureHover: vars.bgTextureHover
			bgImgOpacityHover: vars.bgImgOpacityHover,
			borderColorHover: vars.borderColorHover,
			fcHover: vars.fcHover,
			iconColorHover: vars.iconColorHover
		}, {
			type: "default",
			name: "Active",
			bgColorActive: vars.bgColorActive,
			bgTextureActive: vars.bgTextureActive
			bgImgOpacityActive: vars.bgImgOpacityActive,
			borderColorActive: vars.borderColorActive,
			fcActive: vars.fcActive,
			iconColorActive: vars.iconColorActive
		}, {
			type: "default",
			name: "Highlight",
			bgColorHighlight: vars.bgColorHighlight,
			bgTextureHighlight: vars.bgTextureHighlight
			bgImgOpacityHighlight: vars.bgImgOpacityHighlight,
			borderColorHighlight: vars.borderColorHighlight,
			fcHighlight: vars.fcHighlight,
			iconColorHighlight: vars.iconColorHighlight
		}, {
			type: "modaloverlay"
		}, {
			type: "dropshadow",
			bgTextureShadow: vars.bgTextureShadow,
			bgColorShadow: vars.bgColorShadow,
			bgImgOpacityShadow: vars.bgImgOpacityShadow,
			opacityShadowPerc: vars.opacityShadowPerc,
			thicknessShadow: vars.thicknessShadow,
			offsetTopShadow: vars.offsetTopShadow,
			offsetLeftShadow: vars.offsetLeftShadow,
			cornerRadiusShadow: vars.cornerRadiusShadow
		}])
	};
}

// Returns 'selected="selected"' if param == value
Handlebars.registerHelper( "selected", function( param, value ) {
	return new Handlebars.SafeString( param === value ? "selected=\"selected\"" : "" );
});

// Returns select options with textures - configured to each theme group
Handlebars.registerHelper( "textureOptions", function( select, panel ) {
	var optSet = "";
	textures.forEach(function( texture ) {
		var name = texture.type,
			selected = texture.type === select ? " selected=\"selected\"" : "";
		// Large images need hard coded icon sizes to be useful
		if ( texture.width * texture.height >= 360000 ) {
			texture.width = texture.height = 16;
		}
		// Tall panel element (content, overlay, shadow, etc), don't allow glass texture
		if ( panel === "true" ) {
			if( texture.type !== "glass" ) {
				optSet += "<option value=\"" + texture.type + "\"" + selected + " data-texturewidth=\"" + texture.width + "\" data-textureheight=\"" + texture.height + "\">" + name + "</option>";
			}
		} else {
			optSet += "<option value=\"" + texture.type + "\"" + selected + " data-texturewidth=\"" + texture.width + "\" data-textureheight=\"" + texture.height + "\">" + name + "</option>";
		}
	});
	return optSet;
});

Handlebars.registerHelper( "themeParams", function( serializedVars ) {
	return serializedVars.length > 0 ? "?themeParams=" + querystring.escape( serializedVars ) : "";
});

var appinterfaceTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/appinterface.html", "utf8" ) ),
	compGroupATemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/comp_group_a.html", "utf8" ) ),
	compGroupBTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/comp_group_b.html", "utf8" ) ),
	helpTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/help.html", "utf8" ) ),
	indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/index.html", "utf8" ) ),
	jsonpTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/jsonp.js", "utf8" ) ),
	themegalleryTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/themegallery.html", "utf8" ) ),
	wrapTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/wrap.html", "utf8" ) );

var Frontend = function( args ) {
	_.extend( this, args );
};

Frontend.prototype = {
	index: function( vars, options ) {
		var host = this.host; // DELME
		var theme = new ThemeRoller({
			vars: vars
		});
		options = options || {};
		if ( options.wrap ) {
			options = _.defaults({
				wrap: false
			}, options );
			return wrapTemplate({
				body: this.index( vars, options ),
				resources: this.resources
			});
		}
		return indexTemplate({
			appinterface: appinterfaceTemplate({
				help: helpTemplate(),
				rollyourown: JSON.stringify( rollyourownRenderObject( theme, host ) ),
				themegallery: themegalleryTemplate({
					themeGallery: themeGallery
				})
			}),
			baseVars: themeGallery[ 2 ].serializedVars,
			compGroupA: compGroupATemplate(),
			compGroupB: compGroupBTemplate(),
			host: this.host,
			resources: this.resources
		});
	},

	css: function( vars ) {
		var theme = new ThemeRoller({
			vars: _.extend({
				dynamicImage: true,
				dynamicImageHost: this.host
			}, vars )
		});
		return theme.css();
	},

	icon: function( filename, response, error ) {
		renderImage( filename, response, function( err ) {
			if ( err ) {
				error( err, response );
			}
		});
	},

	rollYourOwn: function( params ) {
		var host = this.host; //DELME
		var theme = new ThemeRoller({
			vars: querystring.parse( params.themeParams )
		});
		return jsonpTemplate({
				callback: params.callback,
				data: JSON.stringify( rollyourownRenderObject( theme, host ) )
			});
	},

	texture: function( filename, response, error ) {
		renderImage( filename, response, function( err ) {
			if ( err ) {
				error( err, response );
			}
		});
	}
};

module.exports = Frontend;
