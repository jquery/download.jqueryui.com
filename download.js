var downloadLogger, jqueryUis,
	_ = require( "underscore" ),
	Builder = require( "./lib/builder" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	JqueryUi = require( "./lib/jquery-ui" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	Packer = require( "./lib/packer" ),
	querystring = require( "querystring" ),
	themeGallery = require( "./lib/themeroller.themegallery" )(),
	ThemeRoller = require( "./lib/themeroller" ),
	winston = require( "winston" );

downloadLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			filename: __dirname + "/log/downloads.log",
			json: false
		})
	]
});

jqueryUis = JqueryUi.all();

Handlebars.registerHelper( "isVersionChecked", function( jqueryUi ) {
	return JqueryUi.getStable().pkg.version === jqueryUi.pkg.version ? " checked=\"checked\"" : "";
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
				categories: JqueryUi.getStable().categories()
			}),
			host: this.host,
			production: this.env.toLowerCase() === "production",
			resources: this.resources,
			jqueryUis: jqueryUis
		});
	},

	components: function( params ) {
		var data, jqueryUi;
		if ( params.version ) {
			jqueryUi = JqueryUi.find( params.version );
		}
		if ( jqueryUi == null ) {
			logger.error( "Invalid input \"version\" = \"" + params.version + "\"" );
			data = { error : "invalid version" };
		} else {
			data = { categories: jqueryUi.categories() };
		}
		return jsonpTemplate({
			callback: params.callback,
			data: JSON.stringify( data )
		});
	},

	create: function( fields, response, callback ) {
		try {
			var builder, components, jqueryUi, packer, start, theme,
				themeVars = null;
			if ( fields.theme !== "none" ) {
				themeVars = querystring.parse( fields.theme );
			}
			if ( themeVars !== null ) {
				// Override with fields if they exist.
				themeVars.folderName = fields[ "theme-folder-name" ] || themeVars.folderName;
				themeVars.scope = fields.scope || themeVars.scope;
			}
			theme = new ThemeRoller({
				vars: themeVars,
				version: fields.version
			});
			components = Object.keys( _.omit( fields, "scope", "theme", "theme-folder-name", "version" ) );
			start = new Date();
			jqueryUi = JqueryUi.find( fields.version );
			builder = new Builder( jqueryUi, components, {
				scope: fields.scope
			});
			packer = new Packer( builder, theme, {
				scope: fields.scope
			});
			response.setHeader( "Content-Type", "application/zip" );
			response.setHeader( "Content-Disposition", "attachment; filename=" + packer.filename() );
			packer.zipTo( response, function( err, written, elapsedTime ) {
				if ( err ) {
					return callback( err );
				}
				// Log statistics
				downloadLogger.info(
					JSON.stringify({
						build_size: written,
						build_time: new Date() - start,
						components: builder.components,
						theme_name: theme.name,
						version: jqueryUi.pkg.version
					})
				);
				return callback();
			});
		} catch( err ) {
			return callback( err );
		}
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
