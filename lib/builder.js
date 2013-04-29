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
	ThemeRoller = require( "./themeroller" ),
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
		src = src.toString( "utf8" );
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
		src = src.toString( "utf8" );
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
	var componentFileNames,
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

	componentFileNames = this.components.map(function( component ) {
		return "jquery.ui." + component + ".js";
	});
	this.bundleJs = this.components.reduce(function( sum, component ) {
		return sum + stripBanner( files.data[ "ui/jquery.ui." + component + ".js" ],"ui/jquery.ui." + component + ".js" );
	}, banner( jqueryUi.pkg, componentFileNames ) );
	this.bundleJsMin = this.components.reduce(function( sum, component ) {
		return sum + stripBanner( files.data[ "ui/minified/jquery.ui." + component + ".min.js" ] );
	}, banner( jqueryUi.pkg, componentFileNames, { minify: true } ) );

	this.baseCss = this.components.reduce(function( sum, component ) {
		return sum + stripBanner( files.data[ "themes/base/jquery.ui." + component + ".css" ] || "" );
	}, "" );
	this.baseCssMin = this.components.reduce(function( sum, component ) {
		return sum + stripBanner( files.data[ "themes/base/minified/jquery.ui." + component + ".min.css" ] || "" );
	}, "" );

	if ( options.scope ) {
		this.baseCss = util.scope( this.baseCss, options.scope );
		this.baseCssMin = util.scope( this.baseCssMin, options.scope );
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
		var baseTheme, baseThemeMin, jqueryFilename, selectedDemoRe,
			add = function( src, dst, data ) {
				build.push({
					path: [ basedir ].concat( dst ).join( "/" ),
					data: src ? files.data[ src ] : data
				});
			},
			addEach = function( filepath ) {
				add( filepath, [ "development-bundle" ].concat( filepath ) );
			},
			addEachDoc = function( filepath ) {
				add( null, [ "development-bundle", filepath ], docsTemplate({
					component: path.basename( filepath ).replace( /\..*/, "" ),
					body: files.data[ filepath ]
				}));
			},
			addThemeImages = function( imageFiles ) {
				imageFiles.forEach(function( imageFile ) {
					[ "css/" + theme.folderName() + "/images", "development-bundle/themes/" + theme.folderName() + "/images", "development-bundle/themes/" + theme.folderName() + "/minified/images" ].forEach(function( dst ) {
						add( null, [ dst, imageFile.path ], imageFile.data );
					});
				});
			},
			basedir = this.basedir,
			build = [],
			bundleCss = function( base, theme, options ) {
				var bundleCss = base,
					fileNames = components.filter( existingCss ).map(function( component ) {
						return "jquery.ui." + component + ".css";
					});
				options = options || {};
				if ( theme instanceof ThemeRoller ) {
					// customTheme:
					if ( !theme.isNull ) {
						if ( options.minify ) {
							bundleCss = bundleCss + sqwish.minify( stripBanner( theme.css() ) );
						} else {
							bundleCss = bundleCss + "\n" + stripBanner( theme.css() );
						}
						fileNames.push( "jquery.ui.theme.css" );
						options.customThemeUrl = theme.url();
					}
				} else {
					// baseTheme:
					bundleCss = bundleCss + "\n" + theme;
					fileNames.push( "jquery.ui.theme.css" );
				}
				return banner( jqueryUi.pkg, fileNames, options ) + bundleCss;
			},
			baseCss = this.baseCss,
			baseCssMin = this.baseCssMin,
			bundleJs = this.bundleJs,
			bundleJsMin = this.bundleJsMin,
			components = this.components,
			effectDemos = [ "addClass", "animate", "hide", "removeClass", "show", "switchClass", "toggle", "toggleClass" ],
			existingCss = function( component ) {
				return files.data[ "themes/base/jquery.ui." + component + ".css" ] !== undefined;
			},
			files = this.jqueryUi.files(),
			jqueryUi = this.jqueryUi,
			options = this.options,
			selected = function( filepath ) {
				return components.length && selectedRe.test( filepath );
			},
			selectedRe = new RegExp( components.join( "|" ) ),
			selectedDemos = function( filepath ) {
				return components.length && selectedDemoRe.test( filepath );
			},
			theme = this.theme;

		baseTheme = stripBanner( files.data[ "themes/base/jquery.ui.theme.css" ].toString( "utf8" ) );
		baseThemeMin = stripBanner( files.data[ "themes/base/minified/jquery.ui.theme.min.css" ].toString( "utf8" ) );
		jqueryFilename = files.jqueryFilename;

		files.commonFiles.forEach( addEach );
		files.componentFiles.filter( selected ).forEach( addEach );

		// Bundle js/css
		[ "development-bundle/ui/jquery-ui" + options.bundleSuffix + ".js",
		  "js/jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix + ".js"
		].forEach(function( dst ) {
			add( null, [ dst ], bundleJs );
		});
		add( null, [ "development-bundle/themes/base/jquery-ui.css" ], bundleCss( baseCss, baseTheme ) );
		if ( !this.options.skipTheme ) {
			[ "css/" + theme.folderName() + "/jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix + ".css",
				"development-bundle/themes/" + theme.folderName() + "/jquery-ui.css"
			].forEach(function( dst ) {
				add( null, [ dst ], bundleCss( baseCss, theme ) );
			});
		}

		// Minified bundle js/css
		[ "development-bundle/ui/minified/jquery-ui" + options.bundleSuffix + ".min.js",
		  "js/jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix + ".min.js"
		].forEach(function( dst ) {
			add( null, [ dst ], bundleJsMin );
		});
		add( null, [ "development-bundle/themes/base/minified/jquery-ui.min.css" ], bundleCss( baseCssMin, baseThemeMin, { minify: true } ) );
		if ( !this.options.skipTheme ) {
			[ "css/" + theme.folderName() + "/jquery-ui-" + jqueryUi.pkg.version + options.bundleSuffix + ".min.css",
				"development-bundle/themes/" + theme.folderName() + "/minified/jquery-ui.min.css"
			].forEach(function( dst ) {
				add( null, [ dst ], bundleCss( baseCssMin, theme, { minify: true } ) );
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
		add( null, [ "development-bundle/demos/index.html" ], demoIndexTemplate({
			demos: files.demoSubdirs.filter( selectedDemos )
		}));

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
					add( null, [ "development-bundle/themes/" + theme.folderName() + "/jquery.ui.all.css" ], stripThemeImport( files.data[ filepath ] ) );
				} else {
					dst = filepath.replace( "themes/base", "development-bundle/themes/" + theme.folderName() );
					if ( options.scope ) {
						add( null, [ dst ], util.scope( files.data[ filepath ].toString( "utf8" ), options.scope ) );
					} else {
						add( filepath, [ dst ] );
					}
				}
			});
		}
		if ( !theme.isNull ) {
			add( null, [ "development-bundle/themes/" + theme.folderName() + "/jquery.ui.theme.css" ], theme.css() );
			add( null, [ "development-bundle/themes/" + theme.folderName() + "/minified/jquery.ui.theme.min.css" ], banner( jqueryUi.pkg, null, { minify: true } ) + sqwish.minify( stripBanner( theme.css() ) ) );
		}

		// Ad hoc
		if ( components.indexOf( "datepicker" ) >= 0 ) {
			[ "ui/i18n/jquery-ui-i18n.js", "ui/minified/i18n/jquery-ui-i18n.min.js" ].forEach( addEach );
		}
		if ( components.indexOf( "effect-scale" ) >= 0 && !options.skipDocs ) {
			[ "docs/puff-effect.html", "docs/size-effect.html" ].forEach( addEach );
		}
		add( jqueryFilename, [ "js", jqueryFilename ] );
		add( null, [ "index.html" ], indexTemplate({
			jquery: jqueryFilename,
			ui: this.ui,
			theme: theme.folderName()
		}));

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
