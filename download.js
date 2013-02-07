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

Handlebars.registerHelper( "isVersionChecked", function( release ) {
	return Release.getStable().pkg.version === release.pkg.version ? " checked=\"checked\"" : "";
});

Handlebars.registerHelper( "join", function( array, sep, options ) {
		return array.map(function( item ) {
			return options.fn( item );
		}).join( sep );
});

var indexTemplate = Handlebars.compile( fs.readFileSync( __dirname + "/template/download/index.html", "utf8" ) ),
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
			components: JSON.stringify({
				categories: Release.getStable().categories()
			}),
			host: this.host,
			resources: this.resources,
			releases: releases
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
			data = { categories: release.categories() };
		}
		return jsonpTemplate({
			callback: params.callback,
			data: JSON.stringify( data )
		});
	},

	theme: function( params ) {
		var selectedTheme = themeGallery[ 0 ];
		if ( params.themeParams ) {
			selectedTheme = new ThemeRoller({
				vars: querystring.parse( params.themeParams )
			});
		}
		return jsonpTemplate({
			callback: params.callback,
			data: JSON.stringify({
				folderName: selectedTheme.folderName(),
				themeGallery: ( selectedTheme.name === "Custom Theme" ?  [ selectedTheme ].concat( themeGallery ) : themeGallery ).map(function( theme ) {
					return {
						isSelected: theme.isEqual( selectedTheme ) ? "selected=\"selected\"" : "",
						name: theme.name,
						serializedVars: theme.serializedVars
					};
				}),
				themerollerParams: selectedTheme.serializedVars.length > 0 ? "#" + selectedTheme.serializedVars : ""
			})
		});
	}
};

module.exports = Frontend;
