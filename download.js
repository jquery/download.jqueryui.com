var deserialize = require( "./lib/util" ).deserialize,
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	release = require( "./lib/release" ).all()[ 0 ],
	themeGallery = require( "./lib/themeroller.themegallery" ),
	ThemeRoller = require( "./lib/themeroller" );

// Returns 'selected="selected"' if param == value
Handlebars.registerHelper( "isSelectedTheme", function( theme, selectedTheme ) {
	return theme.isEqual( selectedTheme ) ? "selected=\"selected\"" : "";
});

var bodyTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/body.html", "utf8" ) ),
	indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/index.html", "utf8" ) ),
	rootTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/root.html", "utf-8" ) );

// FIXME Is this module being used somewhere else? May I change the exports strucure?
module.exports = function( action, params ) {
	var customTheme;
	var selectedTheme = themeGallery[0];
	// TODO these needs to be handled on the client side
	if ( params && params.themeParams ) {
		var customTheme = new ThemeRoller( deserialize( "?" + unescape( params.themeParams ) ) );
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
	return bodyTemplate( {
		action: action || "/download",
		categories: release.categories(),
		pkg: release.pkg,
		selectedTheme: selectedTheme,
		themeGallery: customTheme ?  [ customTheme ].concat( themeGallery ) : themeGallery
	});
};
module.exports.root = function() {
	return rootTemplate();
}
module.exports.index = function( params ) {
	return indexTemplate({
		body: module.exports( "/download", params )
	});
};
module.exports.themes = function() {
	return themeGallery;
}
module.exports.themeroller = function() {
	return require( "./themeroller" ).index( ThemeRoller.defaults );
}