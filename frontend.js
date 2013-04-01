var _ = require( "underscore" ),
	config = require( "./config" ),
	Download = require( "./download" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	JqueryUi = require( "./lib/jquery-ui" ),
	ThemeRoller = require( "./themeroller" );

var errorTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/500.html", "utf-8" ) ),
	rootTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/root.html", "utf-8" ) );

var Frontend = function( options ) {
	options = _.extend( {}, Frontend.defaults, options );
	this.download = new Download( options );
	this.themeroller = new ThemeRoller( options );
};

Frontend.defaults = {
	env: "development",
	host: "",
	resources: {
		jqueryVersion: config.jquery,
		jqueryuiVersion: JqueryUi.getStable().pkg.version
	}
};

Frontend.prototype = {
	root: function() {
		return rootTemplate();
	},

	error: function( response ) {
		response.writeHead( 500 );
		response.end( errorTemplate() );
	}
};

module.exports = Frontend;
