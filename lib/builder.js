var async = require( "async" ),
	banner = require( "./banner" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	handlebars = require( "handlebars" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	semver = require( "semver" ),
	spawn = require( "child_process" ).spawn,
	sqwish = require( "sqwish" ),
	util = require( "./util" );

var demoIndexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/demos_index.html", "utf8" ) ),
	docsTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/docs.html", "utf8" ) ),
	indexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/index.html", "utf8" ) ),
	themeImagesCache = {};

if ( !fs.existsSync( "log" )) {
	fs.mkdir( "log" );
}

function stripBanner( src, file ) {
	if ( src instanceof Buffer ) {
		src = src.toString( "utf-8" );
	}
	try {
		return src.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
	} catch( err ) {
		err.message += "Ops for " + file + ".\n";
		throw err;
	}
}

function stripThemeImport( src ) {
	if ( src instanceof Buffer ) {
		src = src.toString( "utf-8" );
	}
	return src.replace( /@import "jquery\.ui\.theme\.css";\n/, "" );
}


/**
 * Builder( jqueryUi, components, theme, options )
 * - jqueryUi [ instanceof JqueryUi ]: jQuery UI object.
 * - components [ Array / String ]: Array with the component names, or a special string ":all:" that selects all the components.
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
function Builder( jqueryUi, components, theme, options ) {
	var cssHeader, existingCss, header,
		allComponents = jqueryUi.components().map(function( element ) {
			return element.name;
		}),
		files = jqueryUi.files(),
		invalidComponent = function( element ) {
			return allComponents.indexOf( element ) < 0;
		};

	this.options = options = options || {};
	if ( typeof options.bundleSuffix === "undefined" ) {
		options.bundleSuffix = ".custom";
	}


	// Validate components
	if ( typeof components === "string" && components === ":all:" ) {
		components = allComponents;
	}
	if ( components.some( invalidComponent ) ) {
		throw new Error( "Builder: invalid components [ \"" + components.filter( invalidComponent ).join( "\", \"" ) + "\" ]" );
	}

	this.basedir = "jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix;
	this.components = components;
	this.jqueryUi = jqueryUi;
	this.theme = theme;
	this.ui = this.components.reduce(function( sum, component ) {
		sum[ component ] = true;
		return sum;
	}, {});
	this.ui.version = jqueryUi.pkg.version;

	header = banner( jqueryUi.pkg, this.components.map(function( component ) {
		return "jquery.ui." + component + ".js";
	}) ) + "\n\n";
	this.full = this.components.reduce(function( sum, component ) {
		return sum + stripBanner( files.data[ "ui/jquery.ui." + component + ".js" ],"ui/jquery.ui." + component + ".js" );
	}, header );
	this.min = this.components.reduce(function( sum, component ) {
		return sum + stripBanner( files.data[ "ui/minified/jquery.ui." + component + ".min.js" ] );
	}, header );

	existingCss = function( component ) {
		return files.data[ "themes/base/jquery.ui." + component + ".css" ] !== undefined;
	};
	cssHeader = banner( jqueryUi.pkg, this.components.filter( existingCss ).map(function( component ) {
		return "jquery.ui." + component + ".css";
	}) ) + "\n\n";
	this.cssFull = this.components.reduce(function( sum, component ) {
		return sum + stripBanner( files.data[ "themes/base/jquery.ui." + component + ".css" ] || "" );
	}, cssHeader );
	this.cssMin = this.components.reduce(function( sum, component ) {
		return sum + stripBanner( files.data[ "themes/base/minified/jquery.ui." + component + ".min.css" ] || "" );
	}, cssHeader );

	if ( options.scope ) {
		this.cssFull = util.scope( this.cssFull, options.scope );
		this.cssMin = util.scope( this.cssMin, options.scope );
	}

	if ( options.skipTheme ) {
		this.theme = new ( require( "./themeroller" ) )({ vars: null });
	}
}

// Cache all releases (sync)
Builder.cacheJqueryUi = function() {
	var JqueryUi = require( "./jquery-ui" );
	JqueryUi.all().forEach(function( jqueryUi ) {
		jqueryUi.files();
		logger.log( "JqueryUi \"" + jqueryUi.pkg.version + "\" files cached" );
	});
};

// Cache theme gallery image files (overall async, but each theme is cached in series)
Builder.cacheThemeImages = function() {
	var themeGallery = require( "./themeroller.themegallery" )();
	async.forEachSeries( themeGallery, function( theme, callback ) {
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

Builder.prototype = {
	/**
	 * Generates a build array [ <build-item>, ... ], where
	 * build-item = {
	 *   path: String:package destination filepath,
	 *   data: String/Buffer:the content itself
	 * }
	 */
	build: function( callback ) {
		var baseThemeCssFull, baseThemeCssMin, jqueryFilename, selectedDemoRe,
			add = function( src, dst ) {
				build.push({
					path: [ basedir ].concat( dst ).join( "/" ),
					data: files.data[ src ]
				});
			},
			addEach = function( filepath ) {
				add( filepath, [ "development-bundle" ].concat( filepath ) );
			},
			addEachDoc = function( filepath ) {
				build.push({
					path: [ basedir, "development-bundle", filepath ].join( "/" ),
					data: docsTemplate({
						component: path.basename( filepath ).replace( /\..*/, "" ),
						body: files.data[ filepath ]
					})
				});
			},
			addThemeImages = function( imageFiles ) {
				imageFiles.forEach(function( imageFile ) {
					[ "css/" + theme.folderName() + "/images", "development-bundle/themes/" + theme.folderName() + "/images", "development-bundle/themes/" + theme.folderName() + "/minified/images" ].forEach(function( dst ) {
						build.push({
							path: [ basedir, dst, imageFile.path ].join( "/" ),
							data: imageFile.data
						});
					});
				});
			},
			basedir = this.basedir,
			build = [],
			bundleCss = function( allCss, theme, options ) {
				if ( theme.isNull ) {
					return allCss;
				} else {
					options = options || {};
					allCss = allCss.split( "\n" );
					if ( options.minify ) {
						return allCss.slice( 0, 3 ).join( "\n" ) + "\n" + theme.css().split( "\n" )[ 10 ].trim() + "\n" + allCss[ 3 ] + allCss.slice( 5 ).join( "\n" ) + sqwish.minify( stripBanner( theme.css() ) );
					} else {
						return allCss.slice( 0, 3 ).join( "\n" ) + "\n" + theme.css().split( "\n" )[ 10 ].trim() + "\n" + allCss.slice( 3 ).join( "\n" ) + "\n" + stripBanner( theme.css() );
					}
				}
			},
			components = this.components,
			effectDemos = [ "addClass", "animate", "hide", "removeClass", "show", "switchClass", "toggle", "toggleClass" ],
			cssFull = this.cssFull,
			cssMin = this.cssMin,
			files = this.jqueryUi.files(),
			full = this.full,
			min = this.min,
			options = this.options,
			jqueryUi = this.jqueryUi,
			selectedRe = new RegExp( components.join( "|" ) ),
			selected = function( filepath ) {
				return components.length && selectedRe.test( filepath );
			},
			selectedDemos = function( filepath ) {
				return components.length && selectedDemoRe.test( filepath );
			},
			theme = this.theme;

		baseThemeCssFull = files.data[ "themes/base/jquery.ui.theme.css" ].toString( "utf8" );
		baseThemeCssMin = files.data[ "themes/base/minified/jquery.ui.theme.min.css" ].toString( "utf8" );
		jqueryFilename = files.jqueryFilename;

		files.commonFiles.forEach( addEach );
		files.componentFiles.filter( selected ).forEach( addEach );

		// Full
		[ "development-bundle/ui/jquery-ui" + options.bundleSuffix + ".js",
		  "js/jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix + ".js"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: full
			});
		});
		build.push({
			path: [ basedir, "development-bundle/themes/base/jquery-ui.css" ].join( "/" ),
			data: cssFull + "\n" + stripBanner( baseThemeCssFull )
		});
		if ( !this.options.skipTheme ) {
			[ "css/" + theme.folderName() + "/jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix + ".css",
				"development-bundle/themes/" + theme.folderName() + "/jquery-ui.css"
			].forEach(function( dst ) {
				build.push({
					path: [ basedir, dst ].join( "/" ),
					data: bundleCss( cssFull, theme )
				});
			});
		}

		// Min
		[ "development-bundle/ui/minified/jquery-ui" + options.bundleSuffix + ".min.js",
		  "js/jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix + ".min.js"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: min
			});
		});
		build.push({
			path: [ basedir, "development-bundle/themes/base/minified/jquery-ui.min.css" ].join( "/" ),
			data: cssMin + baseThemeCssMin
		});
		if ( !this.options.skipTheme ) {
			[ "css/" + theme.folderName() + "/jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix + ".min.css",
				"development-bundle/themes/" + theme.folderName() + "/minified/jquery-ui.min.css"
			].forEach(function( dst ) {
				build.push({
					path: [ basedir, dst ].join( "/" ),
					data: bundleCss( cssMin, theme, { minify: true } )
				});
			});
		}

		// Demo files
		if ( components.indexOf( "effect" ) >= 0 ) {
			selectedDemoRe = new RegExp( components.concat( effectDemos ).join( "|" ) );
		} else {
			selectedDemoRe = new RegExp( components.join( "|" ) );
		}
		files.demoFiles.filter(function( filepath ) {
			var componentSubdir = filepath.split( "/" )[ 1 ];
			return selectedDemos( componentSubdir );
		}).forEach( addEach );
		build.push({
			path: [ basedir, "development-bundle/demos/index.html" ].join( "/" ),
			data: demoIndexTemplate({
				demos: files.demoSubdirs.filter( selectedDemos )
			})
		});

		// Doc files
		if ( !options.skipDocs ) {
			files.docFiles.filter(function( component ) {
				return !(/effect/).test( component );
			}).filter( selected ).forEach( addEachDoc );
			components.filter(function( component ) {
				return (/effect-/).test( component );
			}).map(function( component ) {
				return component.replace( /^effect-(.*)$/, "docs/$1-effect.html" );
			}).forEach( addEachDoc );
		}

		// Test files
		if ( options.addTests ) {
			files.testFiles.forEach( addEach );
		}

		// Custom theme files
		if ( !this.options.skipTheme ) {
			files.themeFiles.filter(function( filepath ) {
				if ( (/jquery.ui.theme|jquery-ui|images/).test( filepath ) ) {
					return false;
				}
				if ( (/jquery.ui.all|jquery.ui.base/).test( filepath ) ) {
					return true;
				}
				return selected( filepath );
			}).forEach(function( filepath ) {
				var dst;
				if ( theme.isNull && (/jquery.ui.all/).test( filepath ) ) {
					build.push({
						path: [ basedir, "development-bundle/themes/" + theme.folderName() + "/jquery.ui.all.css" ].join( "/" ),
						data: stripThemeImport( files.data[ filepath ] )
					});
				} else {
					dst = filepath.replace( "themes/base", "development-bundle/themes/" + theme.folderName() );
					if ( options.scope ) {
						build.push({
							path: [ basedir, dst ].join( "/" ),
							data: util.scope( files.data[ filepath ].toString( "utf-8" ), options.scope )
						});
					} else {
						add( filepath, [ dst ] );
					}
				}
			});
		}
		if ( !theme.isNull ) {
			build.push({
				path: [ basedir, "development-bundle/themes/" + theme.folderName() + "/jquery.ui.theme.css" ].join( "/" ),
				data: theme.css()
			});
			build.push({
				path: [ basedir, "development-bundle/themes/" + theme.folderName() + "/minified/jquery.ui.theme.min.css" ].join( "/" ),
				data: banner( jqueryUi.pkg, [ "jquery.ui.theme.css" ] ) + "\n" + sqwish.minify( stripBanner( theme.css() ) )
			});
		}

		// Ad hoc
		if ( components.indexOf( "datepicker" ) >= 0 ) {
			[ "ui/i18n/jquery-ui-i18n.js", "ui/minified/i18n/jquery-ui-i18n.min.js" ].forEach( addEach );
		}
		if ( components.indexOf( "effect-scale" ) >= 0 && !options.skipDocs ) {
			[ "docs/puff-effect.html", "docs/size-effect.html" ].forEach( addEach );
		}
		add( jqueryFilename, [ "js", jqueryFilename ] );
		build.push({
			path: [ basedir, "index.html" ].join( "/" ),
			data: indexTemplate({
				jquery: jqueryFilename,
				ui: this.ui,
				theme: theme.folderName()
			})
		});

		// Theme image files
		if ( theme.isNull ) {
			callback( null, build );
		}
		else {
			if ( semver.gte( this.ui.version, "1.10.0" ) ) {
				addThemeImages([{
					path: "animated-overlay.gif",
					data: files.data[ "themes/base/images/animated-overlay.gif" ]
				}]);
			}
			if ( themeImagesCache[ theme.name ] ) {
				// Cached
				addThemeImages( themeImagesCache[ theme.name ] );
				callback( null, build );
			} else {
				// Not cached, fetch them
				theme.generateImages(function( err, imageFiles ) {
					if ( err ) {
						callback( err, null );
						return;
					}
					addThemeImages( imageFiles );
					callback( null, build );
				});
			}
		}
	},

	filename: function() {
		return this.basedir + ".zip";
	},

	zipTo: function( target, callback ) {
		this.build(function( err, build ) {
			if ( err ) {
				return callback( err, null );
			}
			util.createZip( build, target, callback );
		});
	}
};

module.exports = Builder;
