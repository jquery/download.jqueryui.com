// FIXME add cornerRadiusUnit into cornerRadius
// FIXME add fsDefaultUnit into fsDefault
var _ = require( "underscore" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	textures = require( "./lib/themeroller.textures" ),
	themeGallery = require( "./lib/themeroller.themegallery" ),
	ThemeRoller = require( "./lib/themeroller" );

// Returns 'selected="selected"' if param == value
Handlebars.registerHelper( "selected", function( param, value ) {
	return param == value ? "selected=\"selected\"" : "";
});

// Returns select options with textures - configured to each theme group
Handlebars.registerHelper( "textureOptions", function( select, panel ) {
	var optSet = "";
	textures.forEach(function( texture ) {
		var name = texture.file.split( "." )[ 0 ].split( "_" ).slice( 1 ).join( " " ),
			selected = texture.file == select ? " selected=\"selected\"" : "",
			texturedims = [ texture.width, texture.height ];
		// large images need hard coded icon sizes to be useful
		if ( texture.width * texture.height >= 360000 ) {
			texturedims = [ 16, 16 ];
		}
		// tall panel element (content, overlay, shadow, etc), don't allow glass texture
		if ( panel === "true" ) {
			if( texture.file != "02_glass.png" ) {
				 optSet += "<option value=\"" + texture.file + "\"" + selected + " data-texturewidth=\"" + texturedims[0] + "\" data-textureheight=\"" + texturedims[1] + "\">" + name + "</option>";
			}
		} else {
			optSet += "<option value=\"" + texture.file + "\"" + selected + " data-texturewidth=\"" + texturedims[0] + "\" data-textureheight=\"" + texturedims[1] + "\">" + name + "</option>";
		}
	});
	return optSet;
});

Handlebars.registerHelper( "themeParams", function( serializedVars ) {
	return serializedVars.length > 0 ? "?themeParams=" + escape( serializedVars ) : "";
});

var appinterfaceTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/appinterface.html", "utf8" ) ),
	bodyTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/body.html", "utf8" ) ),
	helpTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/help.html", "utf8" ) ),
	indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/index.html", "utf8" ) ),
	rollyourownTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/rollyourown.html", "utf8" ) ),
	themegalleryTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/themegallery.html", "utf8" ) );

var Frontend = function( host ) {
  this.host = host;
};

Frontend.prototype = {
	index: function( vars ) {
		var theme = new ThemeRoller( vars );
		return indexTemplate({
			body: bodyTemplate({
				appinterface: appinterfaceTemplate({
					help: helpTemplate(),
					rollyourown: rollyourownTemplate( theme ),
					themegallery: themegalleryTemplate({
						themeGallery: themeGallery
					})
				})
			})
		});
	},

	css: function( vars ) {
		var theme = new ThemeRoller( _.extend( { dynamicImage: true }, vars ) );
		return theme.css();
	},

	gallery: function() {
    return themeGallery;
	},

	rollYourOwn: function( vars ) {
		var theme = new ThemeRoller( vars );
		return rollyourownTemplate( theme );
	}
};

module.exports = Frontend;
