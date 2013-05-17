var archiver = require( "archiver" ),
	async = require( "async" ),
	banner = require( "./banner" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	handlebars = require( "handlebars" ),
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	semver = require( "semver" ),
	spawn = require( "child_process" ).spawn,
	sqwish = require( "sqwish" ),
	themeGallery = require( "./themeroller.themegallery" ),
	util = require( "./util" ),
	winston = require( "winston" );

var docsTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/docs.html", "utf8" ) ),
	indexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/index.html", "utf8" ) ),
	themeImagesCache = {};

if ( !fs.existsSync( "log" )) {
	fs.mkdir( "log" );
}
var download_logger = new winston.Logger({
		transports: [
			new winston.transports.File({
				filename: __dirname + "/../log/downloads.log",
				json: false
			})
		]
	});

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
 * Builder
 */
function Builder( release, components, theme, options ) {
	var cssHeader, existingCss, header,
		allComponents = release.components().map(function( element ) {
			return element.name;
		}),
		files = release.files(),
		invalidComponent = function( element ) {
			return allComponents.indexOf( element ) < 0;
		};

	this.options = options = options || {};
	if ( typeof options.bundleSuffix === "undefined" ) {
		options.bundleSuffix = ".custom";
	}


	// Validate components
	if ( components.some( invalidComponent ) ) {
		throw new Error( "Builder: invalid components [ \"" + components.filter( invalidComponent ).join( "\", \"" ) + "\" ]" );
	}

	this.basedir = "jquery-ui-" + release.pkg.version + options.bundleSuffix;
	this.components = components;
	this.release = release;
	this.theme = theme;
	this.ui = this.components.reduce(function( sum, component ) {
		sum[ component ] = true;
		return sum;
	}, {});
	this.ui.version = release.pkg.version;

	header = banner( release.pkg, this.components.map(function( component ) {
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
	cssHeader = banner( release.pkg, this.components.filter( existingCss ).map(function( component ) {
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
}

// Cache all releases (sync)
Builder.cacheReleases = function() {
	var Release = require( "./release" );
	Release.all().forEach(function( release ) {
		release.files();
		logger.log( "Release \"" + release.pkg.version + "\" files cached" );
	});
};

// Cache theme gallery image files (overall async, but each theme is cached in series)
Builder.cacheThemeImages = function() {
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
		var baseThemeCssFull, baseThemeCssMin, jqueryFilename,
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
			cssFull = this.cssFull,
			cssMin = this.cssMin,
			files = this.release.files(),
			full = this.full,
			min = this.min,
			options = this.options,
			release = this.release,
			selectedRe = new RegExp( components.join( "|" ) ),
			selected = function( filepath ) {
				return components.length && selectedRe.test( filepath );
			},
			theme = this.theme;

		baseThemeCssFull = files.data[ "themes/base/jquery.ui.theme.css" ].toString( "utf8" );
		baseThemeCssMin = files.data[ "themes/base/minified/jquery.ui.theme.min.css" ].toString( "utf8" );
		jqueryFilename = files.jqueryFilename;

		files.commonFiles.forEach( addEach );
		files.componentFiles.filter( selected ).forEach( addEach );
		files.demoFiles.filter(function( filepath ) {
			var componentSubdir = filepath.split( "/" )[ 1 ];
			return selected( componentSubdir );
		}).forEach( addEach );

		// Full
		[ "development-bundle/ui/jquery-ui" + options.bundleSuffix + ".js",
		  "js/jquery-ui-" + release.pkg.version + options.bundleSuffix + ".js"
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
		[ "css/" + theme.folderName() + "/jquery-ui-" + release.pkg.version + options.bundleSuffix + ".css",
		  "development-bundle/themes/" + theme.folderName() + "/jquery-ui.css"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: bundleCss( cssFull, theme )
			});
		});

		// Min
		[ "development-bundle/ui/minified/jquery-ui" + options.bundleSuffix + ".min.js",
		  "js/jquery-ui-" + release.pkg.version + options.bundleSuffix + ".min.js"
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
		[ "css/" + theme.folderName() + "/jquery-ui-" + release.pkg.version + options.bundleSuffix + ".min.css",
		  "development-bundle/themes/" + theme.folderName() + "/minified/jquery-ui.min.css"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: bundleCss( cssMin, theme, { minify: true } )
			});
		});

		// Doc files
		files.docFiles.filter(function( component ) {
			return !(/effect/).test( component );
		}).filter( selected ).forEach( addEachDoc );
		components.filter(function( component ) {
			return (/effect-/).test( component );
		}).map(function( component ) {
			return component.replace( /^effect-(.*)$/, "docs/$1-effect.html" );
		}).forEach( addEachDoc );

		// Custom theme files
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
		if ( !theme.isNull ) {
			build.push({
				path: [ basedir, "development-bundle/themes/" + theme.folderName() + "/jquery.ui.theme.css" ].join( "/" ),
				data: theme.css()
			});
			build.push({
				path: [ basedir, "development-bundle/themes/" + theme.folderName() + "/minified/jquery.ui.theme.min.css" ].join( "/" ),
				data: banner( release.pkg, [ "jquery.ui.theme.css" ] ) + "\n" + sqwish.minify( stripBanner( theme.css() ) )
			});
		}

		// Ad hoc
		if ( components.indexOf( "datepicker" ) >= 0 ) {
			[ "ui/i18n/jquery-ui-i18n.js", "ui/minified/i18n/jquery-ui-i18n.min.js" ].forEach( addEach );
		}
		if ( components.indexOf( "effect-scale" ) >= 0 ) {
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

	writeTo: function( response, callback ) {
		var that = this,
			start = new Date();
		this.build(function( err, build ) {
			if ( err ) {
				callback( err, null );
				return;
			}
			var zip = archiver.createZip();
			zip.pipe( response );
			async.forEachSeries( build, function( file, next ) {
				if ( file.data == null ) {
					// Null or undefined
					throw new Error( "Builder: missing data of \"" + file.path + "\"" );
				}
				zip.addFile( file.data, { name: file.path }, next );
			}, function() {
				zip.finalize(function( written ) {

					// Log statistics
					download_logger.info( JSON.stringify({
						build_size: written,
						build_time: new Date() - start,
						components: that.components,
						theme_name: that.theme.name,
						version: that.release.pkg.version
					}) );
					callback( null, "All good!" );
				});
			});
		});
	}
};

module.exports = Builder;
