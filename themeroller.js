var _ = require( "underscore" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	Image = require( "./lib/themeroller-image" ),
	querystring = require( "querystring" ),
	textures = require( "./lib/themeroller-textures" ),
	themeGallery = require( "./lib/themeroller-themegallery" )(),
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

// Returns 'selected="selected"' if param == value
Handlebars.registerHelper( "selected", function( param, value ) {
	return new Handlebars.SafeString( param === value ? "selected=\"selected\"" : "" );
});

Handlebars.registerHelper( "themeParams", function( serializedVars ) {
	return serializedVars.length > 0 ? "?themeParams=" + querystring.escape( serializedVars ) : "";
});

var appinterfaceTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/appinterface.html", "utf8" ) ),
	demoTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/themeroller/demo.html", "utf8" ) ),
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
		if ( vars && "zThemeParams" in vars ) {
			delete vars.zThemeParams;
		}
		var production = this.env.toLowerCase() === "production",
			theme = new ThemeRoller({
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
				themegallery: themegalleryTemplate({
					production: production,
					themeGallery: themeGallery
				})
			}),
			baseVars: themeGallery[ 0 ].serializedVars,
			demo: demoTemplate({
				production: production
			}),
			host: this.host,
			lzmaWorker: production ? "/resources/external/lzma_worker.min.js" : "/external/lzma-js/src/lzma_worker.js",
			production: production,
			resources: this.resources,
			textures: JSON.stringify( textures )
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

	texture: function( filename, response, error ) {
		renderImage( filename, response, function( err ) {
			if ( err ) {
				error( err, response );
			}
		});
	}
};

module.exports = Frontend;
