var _ = require( "underscore" ),
	config = require( "./config" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	querystring = require( "querystring" ),
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
	helpTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/help.html", "utf8" ) ),
	indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/index.html", "utf8" ) ),
	jsonpTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/jsonp.js", "utf8" ) ),
	rollyourownTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/rollyourown.html", "utf8" ) ),
	themegalleryTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/themegallery.html", "utf8" ) ),
	wrapTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/wrap.html", "utf8" ) );

var Frontend = function( args ) {
	_.extend( this, args );
};

Frontend.prototype = {
	index: function( vars, options ) {
		var theme = new ThemeRoller( vars );
		options = options || {};
		if ( options.wrap ) {
			options = _.defaults( { wrap: false }, options );
			return wrapTemplate({
				body: this.index( vars, options ),
				resources: this.resources
			});
		}
		return indexTemplate({
			appinterface: appinterfaceTemplate({
				help: helpTemplate(),
				rollyourown: rollyourownTemplate( theme ),
				themegallery: themegalleryTemplate({
					themeGallery: themeGallery
				})
			}),
			baseVars: themeGallery[ 2 ].serializedVars,
			host: this.host,
			imageGeneratorUrl: "http://" + config.imageGeneratorHost + config.imageGeneratorPath + "/",
			resources: this.resources
		});
	},

	css: function( vars ) {
		var theme = new ThemeRoller( _.extend( { dynamicImage: true }, vars ) );
		return theme.css();
	},

	gallery: function() {
    return themeGallery;
	},

	rollYourOwn: function( params ) {
		var theme = new ThemeRoller( querystring.parse( unescape( params.themeParams ) ) );
		return jsonpTemplate({
				callback: params.callback,
				data: JSON.stringify( rollyourownTemplate( theme ) )
			});
	}
};

module.exports = Frontend;
