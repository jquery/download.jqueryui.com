var downloadLogger, jqueryUis,
	_ = require( "underscore" ),
	fs = require( "fs" ),
	Handlebars = require( "handlebars" ),
	JqueryUi = require( "./lib/jquery-ui" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	Packager = require( "node-packager" ),
	querystring = require( "querystring" ),
	semver = require( "semver" ),
	themeGallery = require( "./lib/themeroller-themegallery" )(),
	ThemeRoller = require( "./lib/themeroller" ),
	ToBeDeprecatedBuilder = require( "./lib/builder" ),
	ToBeDeprecatedPacker = require( "./lib/packer" ),
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

Handlebars.registerHelper( "isThereThemeFolder", function( jqueryUi ) {
	return semver.gte( jqueryUi.pkg.version, "1.11.0-a" ) ? " data-no-theme-folder=\"true\"" : "";
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
		var production = this.env.toLowerCase() === "production";
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
				categories: JqueryUi.getStable().categories
			}),
			host: this.host,
			lzmaWorker: production ? "/resources/external/lzma_worker.min.js" : "/external/lzma-js/src/lzma_worker.js",
			production: production,
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
			data = { categories: jqueryUi.categories };
		}
		return jsonpTemplate({
			callback: params.callback,
			data: JSON.stringify( data )
		});
	},

	create: function( fields, response, callback ) {
		try {
			var builder, components, files, jqueryUi, Package, packer, start, theme,
				themeVars = null;
			if ( fields.theme !== "none" ) {
				themeVars = querystring.parse( fields.theme );
			}
			if ( themeVars !== null ) {
				// Override with fields if they exist.
				themeVars.folderName = fields[ "theme-folder-name" ] || themeVars.folderName;
				themeVars.scope = fields.scope || themeVars.scope;
			}
			components = Object.keys( _.omit( fields, "scope", "theme", "theme-folder-name", "version" ) );
			jqueryUi = JqueryUi.find( fields.version );

			// The old way to generate a package (to be deprecated when jQuery UI support baseline is UI 1.12).
			if ( semver.lt( jqueryUi.pkg.version, "1.12.0-a" ) ) {
				start = new Date();
				theme = new ThemeRoller({
					vars: themeVars,
					version: fields.version
				});
				builder = new ToBeDeprecatedBuilder( jqueryUi, components, {
					scope: fields.scope
				});
				packer = new ToBeDeprecatedPacker( builder, theme, {
					scope: fields.scope
				});
				response.setHeader( "Content-Type", "application/zip" );
				response.setHeader( "Content-Disposition", "attachment; filename=" + packer.filename() );
				packer.zipTo( response, function( err, written ) {
					if ( err ) {
						return callback( err );
					}
					// Log statistics
					downloadLogger.info(
						JSON.stringify({
							build_size: written,
							build_time: new Date() - start,
							components: components,
							theme_name: theme && theme.name || "n/a",
							version: jqueryUi.pkg.version
						})
					);
					return callback();
				});

			// The new way to generate a package.
			} else {
				Package = require( "./lib/package-1-12" );
				pkg = new Packager( jqueryUi.files().cache, Package, {
					components: components,
					themeVars: themeVars,
					scope: fields.scope
				});
				response.setHeader( "Content-Type", "application/zip" );
				response.setHeader( "Content-Disposition", "attachment; filename=" + pkg.pkg.zipFilename ); // FIXME
				pkg.toZip( response, {
					basedir: pkg.pkg.zipBasedir // FIXME
				}, function( error ) {
					if ( error ) {
						return callback( error );
					}
					console.log("stats", JSON.stringify(pkg.stats), null, "   ");
					// Log statistics
					downloadLogger.info(
						JSON.stringify({
							build_size: pkg.stats.toZip.size,
							build_time: pkg.stats.toZip.time,
							components: components,
							version: jqueryUi.pkg.version
						})
					);
					return callback();
				});
			}
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
