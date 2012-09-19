var Download = require( "./download" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	ThemeRoller = require( "./themeroller" );

var rootTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/root.html", "utf-8" ) );

var Frontend = function( host ) {
	this.host = host || "";
	this.download = new Download( this.host );
	this.themeroller = new ThemeRoller( this.host );
};

Frontend.prototype = {
	download: function() {}, // stub
	themeroller: function() {}, // stub
  root: function() {
    return rootTemplate();
  }
};

module.exports = Frontend;
