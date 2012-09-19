var _ = require( "underscore" ),
	deserialize = require( "./lib/util" ).deserialize,
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	release = require( "./lib/release" ).all()[ 0 ],
	themeGallery = require( "./lib/themeroller.themegallery" ),
	ThemeRoller = require( "./lib/themeroller" );

// Returns 'selected="selected"' if param == value
Handlebars.registerHelper( "isSelectedTheme", function( theme, selectedTheme ) {
	return theme.isEqual( selectedTheme ) ? "selected=\"selected\"" : "";
});

var indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/index.html", "utf8" ) ),
	jsonpTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/jsonp.js", "utf8" ) ),
	themeTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/theme.html", "utf8" ) );
	wrapTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/wrap.html", "utf8" ) );

var Frontend = function( host ) {
	this.host = host;
};

Frontend.prototype = {
	index: function( params, options ) {
		options = options || {};
		if ( options.wrap ) {
			options = _.defaults( { wrap: false }, options );
			return wrapTemplate({
				body: this.index( params, options )
			});
		}
		return indexTemplate({
				host: this.host,
				categories: release.categories(),
				pkg: release.pkg
			});
	},

	theme: function( params ) {
		var customTheme,
			selectedTheme = themeGallery[ 0 ];
		if ( params.themeParams ) {
			customTheme = new ThemeRoller( deserialize( "?" + unescape( params.themeParams ) ) );
			var inThemeGallery = themeGallery.some(function( theme ) {
					var isEqual = customTheme.isEqual( theme );
					if ( isEqual ) {
						selectedTheme = theme;
					}
					return isEqual;
				});
			if ( !inThemeGallery ) {
				customTheme.name = "Custom Theme";
				selectedTheme = customTheme;
			} else {
				customTheme = false;
			}
		}
		return jsonpTemplate({
				callback: params.callback,
				data: JSON.stringify( themeTemplate({
					folderName: selectedTheme.folderName(),
					selectedTheme: selectedTheme,
					themeGallery: customTheme ?  [ customTheme ].concat( themeGallery ) : themeGallery
				}))
			});
	}
};

module.exports = Frontend;
