var indexTemplate, pack, themeImagesCache,
	async = require( "async" ),
	banner = require( "./banner" ),
	Files = require( "./files" ),
	fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	path = require( "path" ),
	semver = require( "semver" ),
	sqwish = require( "sqwish" ),
	util = require( "./util" );

indexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/index-1-10.html", "utf8" ) );

function stripThemeImport( src ) {
	if ( src instanceof Buffer ) {
		src = src.toString( "utf8" );
	}
	return src.replace( /@import "jquery\.ui\.theme\.css";\n/, "" );
}

/**
 * Generates a build array [ <build-item>, ... ], where
 * build-item = {
 *   path: String:package destination filepath,
 *   data: String/Buffer:the content itself
 * }
 */
pack = function( callback ) {
	var build,
		add = function( file ) {
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
		builder = this.builder,
		options = this.options,
		output = [],
		theme = this.theme,
		themeImagesCache = this.themeImagesCache;

	function _build( callback ) {
		builder.build(function( error, _build ) {
			if ( error ) {
				return callback( error );
			}
			build = _build;
			callback();
		});
	}

	function pack( callback ) {
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
		if ( !options.skipTheme ) {
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
			if ( !build.docFiles ) {
				throw new Error( "Missing docFiles" );
			}
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
		if ( !options.skipTheme ) {
			build.baseThemeExceptThemeOrImages.forEach(function( file ) {
				if ( theme.isNull && (/all.css/).test( file.path ) ) {
					add( "development-bundle/themes/" + theme.folderName() + "/" + path.basename( file.path ), stripThemeImport( file.data ) );
				} else {
					add( file.path.replace( "themes/base", "development-bundle/themes/" + theme.folderName() ), options.scope ? util.scope( file.data.toString( "utf8" ), options.scope ) : file.data );
				}
			});
			// minified custom theme
			build.baseThemeMinFiles.filter(function( file ) {
				return !(/theme\W/).test( file.path );
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
	}

	async.series([
		_build,
		pack
	], function( error ) {
		callback( error, output );
	});
};


/**
 * Packer( builder, theme, options )
 * - builder [ instanceof Builder ]: jQuery UI builder object.
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
function Packer_1_10( builder, theme, options ) {
	if ( options.skipTheme ) {
		this.theme = new ( require( "./themeroller" ) )({ vars: null });
	}
	this.pack = pack;
}

module.exports = Packer_1_10;
