var indexTemplate, themeImagesCache,
	async = require( "async" ),
	banner = require( "./banner" ),
	Files = require( "./files" ),
	fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	JqueryUi = require( "./jquery-ui" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	semver = require( "semver" ),
	sqwish = require( "sqwish" ),
	util = require( "./util" );

indexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/index.html", "utf8" ) ),
themeImagesCache = {};

if ( !fs.existsSync( "log" )) {
	fs.mkdir( "log" );
}

function stripThemeImport( src ) {
	if ( src instanceof Buffer ) {
		src = src.toString( "utf8" );
	}
	return src.replace( /@import "jquery\.ui\.theme\.css";\n/, "" );
}


/**
 * Packer( build, theme, options )
 * - build [ instanceof Builder ]: jQuery UI build object.
 * - theme [ instanceof ThemeRoller ]: theme object.
 * - options: details below.
 *
 * options:
 * - addTests [ Boolean ]: Include test files on package. Default is false.
 * - bundleSuffix [ String ]: Change bundle filename suffix. Default is ".custom".
 * - scope [ String ]: Insert a scope string on the css selectors.
 * - skipDocs [ Boolean ]: Skip doc files on package. Default is false.
 * - skipTheme [ Boolean ]: Skip theme files on package. Default is false.
 */
function Packer( build, theme, options ) {
	this.options = options = options || {};
	if ( typeof options.bundleSuffix === "undefined" ) {
		options.bundleSuffix = ".custom";
	}

	this.basedir = "jquery-ui-" + build.pkg.version + options.bundleSuffix;
	this._build = build;
	this.theme = theme;

	if ( options.skipTheme ) {
		this.theme = new ( require( "./themeroller" ) )({ vars: null });
	}
}

// TODO shall we move it to themeroller.image.js?
Packer.cacheThemeGalleryImages = function() {
	async.forEachSeries( require( "./themeroller.themegallery" )(), function( theme, callback ) {
		theme.generateImages(function( err, imageFiles ) {
			if ( err ) {
				logger.error( "Caching theme images: " + ( err.stack || err ) );
			} else {
				themeImagesCache[ theme.name ] = imageFiles;
				logger.log( "Theme \"" + theme.name + "\" image files cached" );
			}
			callback();
		});
	});
};

Packer.prototype = {
	/**
	 * Generates a build array [ <build-item>, ... ], where
	 * build-item = {
	 *   path: String:package destination filepath,
	 *   data: String/Buffer:the content itself
	 * }
	 */
	pack: function( callback ) {
		var add = function( file ) {
				if ( arguments.length === 2 ) {
					file = {
						path: arguments[ 0 ],
						data: arguments[ 1 ]
					};
				}
				output.push({
					path: path.join( basedir, file.path ),
					data: file.data
				});
			},
			basedir = this.basedir,
			build = this._build,
			options = this.options,
			output = [],
			theme = this.theme;

		// Common and component files (includes baseThemeFiles)
		build.commonFiles.into( "development-bundle/" ).forEach( add );
		build.componentFiles.into( "development-bundle/" ).forEach( add );

		build.componentMinFiles
			.rename( /^ui/, "ui/minified" )
			.into( "development-bundle/" ).forEach( add );

		// Base theme (baseThemeFiles have been included by componentFiles)
		build.baseThemeMinFiles
			.rename( /^themes\/base/, "themes/base/minified" )
			.into( "development-bundle/" ).forEach( add );

		build.baseThemeImages
			.rename( /^themes\/base\/images/, "themes/base/minified/images" )
			.into( "development-bundle/" ).forEach( add );

		// I18n
		build.i18nFiles.into( "development-bundle/" ).forEach( add );
		build.i18nMinFiles
			.rename( /^ui\/i18n/, "ui/minified/i18n" )
			.into( "development-bundle/" ).forEach( add );
		build.bundleI18n.into( "development-bundle/ui/i18n/" ).forEach( add );
		build.bundleI18nMin.into( "development-bundle/ui/minified/i18n/" ).forEach( add );

		// Bundle JS (and minified)
		build.bundleJs
			.rename( /^jquery-ui/, "jquery-ui" + options.bundleSuffix )
			.into( "development-bundle/ui/" ).forEach( add );

		build.bundleJs
			.rename( /^jquery-ui/, "jquery-ui-" + build.pkg.version + options.bundleSuffix )
			.into( "js/" ).forEach( add );

		build.bundleJsMin
			.rename( /^jquery-ui/, "jquery-ui" + options.bundleSuffix )
			.into( "development-bundle/ui/minified/" ).forEach( add );

		build.bundleJsMin
			.rename( /^jquery-ui/, "jquery-ui-" + build.pkg.version + options.bundleSuffix )
			.into( "js/" ).forEach( add );

		// Bundle CSS (and minified)
		build.bundleCss( build.baseTheme ).into( "development-bundle/themes/base/" ).forEach( add );
		build.bundleCssMin( build.baseThemeMin ).into( "development-bundle/themes/base/minified/" ).forEach( add );
		if ( !this.options.skipTheme ) {
			build.bundleCss( theme )
				.tee(function( clone ) {
					clone.into( "development-bundle/themes/" + theme.folderName() + "/" ).forEach( add );
				})
				.rename( /^jquery-ui/, "jquery-ui-" + build.pkg.version + options.bundleSuffix )
				.into( "css/" + theme.folderName() + "/" ).forEach( add );

			build.bundleCssMin( theme )
				.tee(function( clone ) {
					clone.into( "development-bundle/themes/" + theme.folderName() + "/minified/" ).forEach( add );
				})
				.rename( /^jquery-ui/, "jquery-ui-" + build.pkg.version + options.bundleSuffix )
				.into( "css/" + theme.folderName() + "/" ).forEach( add );
		}

		// Demo files
		build.demoFiles.into( "development-bundle/" ).forEach( add );

		// Doc files
		if ( !options.skipDocs ) {
			build.docFiles.into( "development-bundle/" ).forEach( add );
		}

		// Test files
		if ( options.addTests ) {
			build.testFiles.into( "development-bundle/" ).forEach( add );
		}

		// Ad hoc
		build.jqueryCore.into( "js/" ).forEach( add );
		add( "index.html", indexTemplate({
			bundleCss: "jquery-ui-" + build.pkg.version + options.bundleSuffix + ".css",
			bundleJs: "jquery-ui-" + build.pkg.version + options.bundleSuffix + ".js",
			jqueryCore: build.jqueryCore[ 0 ].path,
			ui: build.components.reduce(function( sum, component ) {
				sum[ component ] = true;
				return sum;
			}, {}),
			themeFolderName: theme.folderName(),
			version: build.pkg.version
		}));

		// Custom theme files
		if ( !this.options.skipTheme ) {
			build.baseThemeExceptThemeOrImages.forEach(function( file ) {
				if ( theme.isNull && (/jquery.ui.all/).test( file.path ) ) {
					add( "development-bundle/themes/" + theme.folderName() + "/jquery.ui.all.css", stripThemeImport( file.data ) );
				} else {
					add( file.path.replace( "themes/base", "development-bundle/themes/" + theme.folderName() ), options.scope ? util.scope( file.data.toString( "utf8" ), options.scope ) : file.data );
				}
			});
			// minified custom theme
			build.baseThemeMinFiles.filter(function( file ) {
				return !(/ui\.theme/).test( file.path );
			}).map(function( file ) {
				return options.scope ? { path: file.path, data: util.scope( file.data, options.scope ) } : file;
			}).rename( /^themes\/base/, "themes/" + theme.folderName() + "/minified" ).into( "development-bundle/" ).forEach( add );
		}
		if ( !theme.isNull ) {
			add( "development-bundle/themes/" + theme.folderName() + "/jquery.ui.theme.css", theme.css() );
			add( "development-bundle/themes/" + theme.folderName() + "/minified/jquery.ui.theme.min.css", banner( build.pkg, null, { minify: true } ) + sqwish.minify( util.stripBanner({ data: theme.css() }) ) );
		}

		// Custom theme image files
		if ( theme.isNull ) {
			callback( null, output );
		}
		else {
			async.series([
				function( callback ) {
					var themeImages = Files();
					if ( semver.gte( build.pkg.version, "1.10.0" ) ) {
						themeImages.push({
							path: "animated-overlay.gif",
							data: build.get( "themes/base/images/animated-overlay.gif" ).data
						});
					}
					if ( themeImagesCache[ theme.name ] ) {
						// Cached
						callback( null, themeImages.concat( themeImagesCache[ theme.name ] ) );
					} else {
						// Not cached, fetch them
						theme.generateImages(function( err, imageFiles ) {
							if ( err ) {
								callback( err, null );
								return;
							}
							callback( null, themeImages.concat( imageFiles ) );
						});
					}
				}
			], function( err, themeImages ) {
				if ( err ) {
					callback( err, null );
				}
				themeImages[ 0 ].into( [ "css/" + theme.folderName() + "/images/", "development-bundle/themes/" + theme.folderName() + "/images/", "development-bundle/themes/" + theme.folderName() + "/minified/images/" ] ).forEach( add );
				callback( null, output );
			});
		}
	},

	filename: function() {
		return this.basedir + ".zip";
	},

	zipTo: function( target, callback ) {
		this.pack(function( err, files ) {
			if ( err ) {
				return callback( err, null );
			}
			util.createZip( files, target, callback );
		});
	}
};

module.exports = Packer;
