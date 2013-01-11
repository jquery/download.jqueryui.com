var _ = require( "underscore" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	querystring = require( "querystring" ),
	textures = require( "./lib/themeroller.textures" ),
	themeGallery = require( "./lib/themeroller.themegallery" ),
	ThemeRoller = require( "./lib/themeroller" );

function imagesGeneratorHelper( fn, params, response, callback ) {
	try {
		fn( params, function( err, data ) {
			if ( err ) {
				callback( err );
			} else {
				response.setHeader( "Content-Type", "image/png" );
				response.end( data );
				callback();
			}
		});
	} catch( err ) {
		callback( err );
	}
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
	rollyourownTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/rollyourown.html", "utf8" ) ),
	themegalleryTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/themegallery.html", "utf8" ) ),
	wrapTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/wrap.html", "utf8" ) );

var Frontend = function( args ) {
	_.extend( this, args );
};

Frontend.prototype = {
	index: function( vars, options ) {
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
				rollyourown: rollyourownTemplate( theme ),
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

	// used by jQuery UI release process to generate themes
	gallery: function() {
		return themeGallery;
	},

	icon: function( filename, response, error ) {
		var match, params;

		// ui-icons_<color>_256x240.png
		match = filename.match( /^ui-icons_(\w+)_256x240.png$/i );

		if ( match == null ) {
			return error( new Error( "Invalid format: " + filename ), response );
		}

		params = {
			color: match[ 1 ]
		};

		imagesGeneratorHelper( ThemeRoller.generateIcon, params, response, function( err ) {
			if ( err ) {
				error( err, response );
			}
		});
	},

	rollYourOwn: function( params ) {
		var theme = new ThemeRoller({
			vars: querystring.parse( params.themeParams )
		});
		return jsonpTemplate({
				callback: params.callback,
				data: JSON.stringify( rollyourownTemplate( theme ) )
			});
	},

	texture: function( filename, response, error ) {
		var match, params;

		// ui-bg_<type>_<opacity>_<color>_<width>x<height>.png
		match = filename.match( /^ui-bg_([a-z0-9\-]+)_(\w+)_(\w+)_(\d+)x(\d+).png$/i );

		if ( match == null ) {
			return error( new Error( "Invalid format: " + filename ), response );
		}

		params = {
			type: match[ 1 ],
			opacity: match[ 2 ],
			color: match[ 3 ],
			width: match[ 4 ],
			height: match[ 5 ]
		};

		imagesGeneratorHelper( ThemeRoller.generateTexture, params, response, function( err ) {
			if ( err ) {
				error( err, response );
			}
		});
	}
};

module.exports = Frontend;
