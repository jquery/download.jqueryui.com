var releases,
	_ = require( "underscore" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	querystring = require( "querystring" ),
	Release = require( "./lib/release" ),
	themeGallery = require( "./lib/themeroller.themegallery" ),
	ThemeRoller = require( "./lib/themeroller" );

releases = Release.all();

// Returns 'selected="selected"' if param == value
Handlebars.registerHelper( "isSelectedTheme", function( theme, selectedTheme ) {
	return theme.isEqual( selectedTheme ) ? "selected=\"selected\"" : "";
});

Handlebars.registerHelper( "isVersionChecked", function( release ) {
	return Release.getStable().pkg.version === release.pkg.version ? " checked=\"checked\"" : "";
});

Handlebars.registerHelper( "themerollerParams", function( serializedVars ) {
	return serializedVars.length > 0 ? "#" + serializedVars : "";
});

var componentsTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/components.html", "utf8" ) ),
	indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/index.html", "utf8" ) ),
	jsonpTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/jsonp.js", "utf8" ) ),
	themeTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/theme.html", "utf8" ) ),
	wrapTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/wrap.html", "utf8" ) );

var Frontend = function( args ) {
	_.extend( this, args );
};

Frontend.prototype = {
	index: function( params, options ) {
		options = options || {};
		if ( options.wrap ) {
			options = _.defaults({
				wrap: false
			}, options );
			return wrapTemplate({
				body: this.index( params, options ),
				resources: this.resources
			});
		}
		return indexTemplate({
			baseVars: themeGallery[ 2 ].serializedVars,
			components: componentsTemplate({
				categories: Release.getStable().categories()
			}),
			host: this.host,
			resources: this.resources,
			releases: releases.map(function( release ) {
				return {
					label: release.label ? "(" + release.label + ")" : "",
					pkg: release.pkg
				};
			})
		});
	},

	components: function( params ) {
		var data, release;
		if ( params.version ) {
			release = Release.find( params.version );
		}
		if ( release == null ) {
			logger.error( "Invalid input \"version\" = \"" + params.version + "\"" );
			data = { error : "invalid version" };
		} else {
			data = componentsTemplate({
				categories: release.categories()
			});
		}
		return jsonpTemplate({
			callback: params.callback,
			data: JSON.stringify( data )
		});
	},

	theme: function( params ) {
		var selectedTheme = themeGallery[ 0 ];
		if ( params.themeParams ) {
			selectedTheme = new ThemeRoller( querystring.parse( params.themeParams ) );
		}
		return jsonpTemplate({
			callback: params.callback,
			data: JSON.stringify( themeTemplate({
				folderName: selectedTheme.folderName(),
				selectedTheme: selectedTheme,
				themeGallery: selectedTheme.name === "Custom Theme" ?  [ selectedTheme ].concat( themeGallery ) : themeGallery
			}))
		});
	}
};

module.exports = Frontend;
