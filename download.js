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
	indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/index.html", "utf8" ) );

var Frontend = function( host ) {
  this.host = host;
};

Frontend.prototype = {
  index: function( params ) {
    var customTheme;
    var selectedTheme = themeGallery[ 0 ];
    // TODO these needs to be handled on the client side
    if ( params && params.themeParams ) {
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
    return bodyTemplate( {
      host: this.host,
      categories: release.categories(),
      folderName: selectedTheme.folderName(),
      pkg: release.pkg,
      selectedTheme: selectedTheme,
      themeGallery: customTheme ?  [ customTheme ].concat( themeGallery ) : themeGallery
    });
  },

  download: function( params ) {
    return indexTemplate({
      body: module.exports( "/download", params )
    });
  }
};

module.exports = Frontend;
