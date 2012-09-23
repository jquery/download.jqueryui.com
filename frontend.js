var Download = require( "./download" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	ThemeRoller = require( "./themeroller" );

var rootTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/root.html", "utf-8" ) );

var Frontend = function( host ) {
	var args = {
		host: ( host || "" ),
		resources: {
			jqueryVersion: "1.7.2",
			jqueryuiVersion: "1.9.0-rc.1"
		}
	}
	this.download = new Download( args );
	this.themeroller = new ThemeRoller( args );
};

Frontend.prototype = {
	download: function() {}, // stub
	themeroller: function() {}, // stub
  root: function() {
    return rootTemplate();
  }
};

module.exports = Frontend;
