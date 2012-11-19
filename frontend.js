var config = require( "./config" ),
	Download = require( "./download" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	Release = require( "./lib/release" ),
	ThemeRoller = require( "./themeroller" );

var rootTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/root.html", "utf-8" ) );

var Frontend = function( host ) {
	var args = {
		host: ( host || "" ),
		resources: {
			jqueryVersion: config.jquery,
			jqueryuiVersion: Release.getStable().pkg.version
		}
	};
	this.download = new Download( args );
	this.themeroller = new ThemeRoller( args );
};

Frontend.prototype = {
	root: function() {
		return rootTemplate();
	}
};

module.exports = Frontend;
