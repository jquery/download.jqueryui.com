"use strict";

var _ = require( "underscore" ),
	config = require( "./config" ),
	Download = require( "./download" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	JqueryUi = require( "./lib/jquery-ui" ),
	ThemeRoller = require( "./themeroller" );

var errorTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/500.html", "utf-8" ) ),
	rootTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/root.html", "utf-8" ) );

/**
 * Frontend( options )
 * - options [ Object ]: key-value pairs detailed below.
 *
 * options
 * - config [ Object ]: optional, if present used instead of the `config.json` file;
 * - env [ String ]: optional, specify whether in development or production environment. Default: "development".
 * - host [ String ]: optional, specify the host where download.jqueryui.com server is running. Default: "" (empty string).
 *
 */
var Frontend = function( options ) {
	this.options = options = _.extend( {}, Frontend.defaults, options );
	if ( options.config && typeof options.config === "object" ) {
		require( "./lib/config" ).get = function() {
			return options.config;
		};
	}
	this.download = new Download( options );
	this.themeroller = new ThemeRoller( options );
};

Frontend.defaults = {
	env: "development",
	host: "",
	resources: {
		jqueryVersion: config.jquery,
		jqueryuiVersion: JqueryUi.getStable().pkg.version,
		jqueryVersionForThemeRoller: config.themeroller.jquery,
		jqueryuiVersionForThemeroller: config.themeroller.jqueryUi
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
