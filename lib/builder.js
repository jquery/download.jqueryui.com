var async = require( "async" ),
	banner = require( "./banner" ),
	ThemeRoller = require( "./themeroller" );
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	handlebars = require( "handlebars" ),
	path = require( "path" ),
	release = require( "./release" ).all()[ 0 ],
	spawn = require( "child_process" ).spawn,
	sqwish = require( "sqwish" ),
	winston = require( "winston" ),
	zipstream = require( "zipstream" );

var docsTemplate = handlebars.compile( fs.readFileSync( "template/zip/docs.html", "utf8" ) ),
	indexTemplate = handlebars.compile( fs.readFileSync( "template/zip/index.html", "utf8" ) ),
	cache = {};

var download_logger = new winston.Logger({
		transports: [
			new winston.transports.File({
				filename: "log/downloads.log",
				json: false
			})
		]
	});

function stripBanner( src ) {
	if ( src instanceof Buffer ) {
		src = src.toString( "utf-8" );
	}
	return src.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
}

function stripThemeImport( src ) {
	if ( src instanceof Buffer ) {
		src = src.toString( "utf-8" );
	}
	return src.replace( /@import "jquery\.ui\.theme\.css";\n/, "" );
}

function cacheIt( filepath ) {
	cache[ filepath ] = fs.readFileSync( release.path + filepath );
}

/**
 * Build cache
 */

var flatten = function( flat, arr ) {
		return flat.concat( arr );
	},
	noDirectory = function( filepath ) {
		return ! fs.statSync( filepath ).isDirectory();
	},
	stripReleasePath = function( filepath ) {
		return filepath.replace( release.path, "" );
	};

// Common files
var commonFiles = [
	"*",
	"external/*",
	"demos/demos.css",
	"demos/images/*",
	"themes/base/jquery.ui.all.css",
	"themes/base/jquery.ui.base.css",
	"themes/base/jquery.ui.theme.css",
	"themes/base/images/*",
	"themes/base/minified/jquery.ui.theme.min.css",
	"themes/base/minified/images/*"
].map(function( path ) {
	return glob( release.path + path ).filter( noDirectory ).map( stripReleasePath ).filter(function( filepath ) {
		return ! (/^MANIFEST$|\.jquery\.json$/).test( filepath );
	});
}).reduce( flatten, [] );

// Component files
var componentFiles = [
	"*jquery.json",
	"ui/**",
	"themes/base/jquery*",
	"themes/base/minified/jquery*"
].map(function( path ) {
	return glob( release.path + path ).filter( noDirectory ).map( stripReleasePath );
}).reduce( flatten, [] );

// Demo files
var demoFiles = glob( release.path + "demos/*/**" ).filter( noDirectory ).map( stripReleasePath );

// Doc files
var docFiles = glob( release.path + "docs/*" ).map( stripReleasePath );

// Cache them
commonFiles.forEach( cacheIt );
componentFiles.forEach( cacheIt );
demoFiles.forEach( cacheIt );
docFiles.forEach( cacheIt );

// Auxiliary variables
var imageFiles = glob( release.path + "themes/base/images/*" ).map( stripReleasePath );
var jqueryFilename = stripReleasePath( glob( release.path + "jquery-*" )[ 0 ] );
var themeFiles = glob( release.path + "themes/base/**" ).map( stripReleasePath );

// Base theme
var baseThemeCssFull = fs.readFileSync( release.path + "themes/base/jquery.ui.theme.css", "utf8" );
var baseThemeCssMin = fs.readFileSync( release.path + "themes/base/minified/jquery.ui.theme.min.css", "utf8" );


/**
 * Builder
 */
function Builder( components, theme ) {
	var cssHeader, existingCss, header;

	this.basedir = "jquery-ui-" + release.pkg.version + ".custom";
	this.components = components;
	this.theme = theme;
	this.ui = this.components.reduce(function( sum, field ) {
		sum[ field ] = true;
		return sum;
	}, {});
	this.ui.version = release.pkg.version;

	header = banner( release.pkg, this.components.map(function( field ) {
		return "jquery.ui." + field + ".js";
	}) ) + "\n";
	this.full = this.components.reduce(function( sum, field ) {
		return sum + stripBanner( cache[ "ui/jquery.ui." + field + ".js" ] );
	}, header );
	this.min = this.components.reduce(function( sum, field ) {
		return sum + stripBanner( cache[ "ui/minified/jquery.ui." + field + ".min.js" ] );
	}, header );

	existingCss = function( field ) {
		return cache[ "themes/base/jquery.ui." + field + ".css" ] !== undefined;
	};
	cssHeader = banner( release.pkg, this.components.filter( existingCss ).map(function( field ) {
		return "jquery.ui." + field + ".css";
	}) ) + "\n";
	this.cssFull = this.components.reduce(function( sum, field ) {
		return sum + stripBanner( cache[ "themes/base/jquery.ui." + field + ".css" ] || "" );
	}, cssHeader );
	this.cssMin = this.components.reduce(function( sum, field ) {
		return sum + stripBanner( cache[ "themes/base/minified/jquery.ui." + field + ".min.css" ] || "" );
	}, cssHeader );
}

Builder.prototype = {
	/**
	 * Generates a build array [ <build-item>, ... ], where
	 * build-item = {
	 *   path: String:package destination filepath,
	 *   data: String/Buffer:the content itself
	 * }
	 */
	build: function( callback ) {
		var add = function( src, dst ) {
				build.push({
					path: [ basedir ].concat( dst ).join( "/" ),
					data: cache[ src ]
				});
			},
			addEach = function( filepath ) {
				add( filepath, [ "development-bundle" ].concat( filepath ) );
			},
			addEachDoc = function( filepath ) {
				build.push({
					path: [ basedir, "development-bundle", filepath ].join( "/" ),
					data: docsTemplate({
						component: path.basename( filepath ).replace(/\..*/, ""),
						body: cache[ filepath ]
					})
				});
			},
			basedir = this.basedir,
			build = [],
			cssFull = this.cssFull,
			cssMin = this.cssMin,
			full = this.full,
			min = this.min,
			selectedRe = new RegExp( this.components.join( "|" ) ),
			selected = function( filepath ) {
				return selectedRe.test( filepath );
			},
			theme = this.theme;

		commonFiles.forEach( addEach );
		componentFiles.filter( selected ).forEach( addEach );
		demoFiles.filter(function( filepath ) {
			var componentSubdir = filepath.split( "/" )[ 1 ];
			return selected( componentSubdir );
		}).forEach( addEach );

		// Full
		[ "development-bundle/ui/jquery-ui.custom.js",
		  "js/jquery-ui-" + release.pkg.version + ".custom.js"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: full
			});
		});
		build.push({
			path: [ basedir, "development-bundle/themes/base/jquery-ui.css" ].join( "/" ),
			data: cssFull + "\n\n" + baseThemeCssFull
		});
		[ "css/" + theme.folderName() + "/jquery-ui-" + release.pkg.version + ".custom.css",
		  "development-bundle/themes/" + theme.folderName() + "/jquery-ui.css"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: cssFull + ( theme.isNull ? "" : "\n\n" + theme.css() )
			});
		});

		// Min
		[ "development-bundle/ui/minified/jquery-ui.custom.min.js",
		  "js/jquery-ui-" + release.pkg.version + ".custom.min.js"
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
		[ "css/" + theme.folderName() + "/jquery-ui-" + release.pkg.version + ".custom.min.css",
		  "development-bundle/themes/" + theme.folderName() + "/minified/jquery-ui.min.css"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: cssMin + ( theme.isNull ? "" : sqwish.minify( stripBanner( theme.css() ) ) )
			});
		});

		// Doc files
		docFiles.filter(function( field ) {
			return !(/effect/).test( field );
		}).filter( selected ).forEach( addEachDoc );
		this.components.filter(function( field ) {
			return (/effect-/).test( field );
		}).map(function( field ) {
			return field.replace( /^effect-(.*)$/, "docs/$1-effect.html" );
		}).forEach( addEachDoc );

		// Custom theme files
		themeFiles.filter(function( filepath ) {
			if ( (/jquery.ui.theme|jquery-ui|images/).test( filepath ) ) {
				return false;
			}
			if ( (/jquery.ui.all|jquery.ui.base/).test( filepath ) ) {
				return true;
			}
			return selected( filepath );
		}).forEach(function( filepath ) {
			if ( theme.isNull && (/jquery.ui.all/).test( filepath ) ) {
				build.push({
					path: [ basedir, "development-bundle/themes/" + theme.folderName() + "/jquery.ui.all.css" ].join( "/" ),
					data: stripThemeImport( cache[ filepath ] )
				});
			} else {
				add( filepath, [ filepath.replace( "themes/base", "development-bundle/themes/" + theme.folderName() ) ] );
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
		if ( this.components.indexOf( "datepicker" ) >= 0 ) {
			[ "ui/i18n/jquery-ui-i18n.js", "ui/minified/i18n/jquery-ui-i18n.min.js" ].forEach( addEach );
		}
		if ( this.components.indexOf( "effect-scale" ) >= 0 ) {
			[ "docs/puff-effect.html", "docs/size-effect.html" ].forEach( addEach );
		}
		add( jqueryFilename, [ "js", jqueryFilename ] );
		build.push({
			path: [ basedir, "index.html" ].join( "/" ),
			data: indexTemplate({
				jquery: jqueryFilename,
				ui: this.ui
			})
		});

		// Theme image files
		if ( theme.isNull ) {
			callback( build );
		}
		else {
			theme.fetchImages(function( imageFiles ) {
				imageFiles.forEach(function( imageFile ) {
					[ "css/" + theme.folderName() + "/images", "development-bundle/themes/" + theme.folderName() + "/images", "development-bundle/themes/" + theme.folderName() + "/minified/images" ].forEach(function( dst ) {
						build.push({
							path: [ basedir, dst, imageFile.path ].join( "/" ),
							data: imageFile.data
						});
					});
				});
				callback( build );
			});
		}
	},

	filename: function() {
		return this.basedir + ".zip";
	},

	writeTo: function( response, callback ) {
		var that = this,
			start = new Date();
		this.build(function( build ) {
			var zip = zipstream.createZip();
			zip.pipe( response );
			async.forEachSeries( build, function( file, next ) {
				zip.addFile( file.data, { name: file.path }, next );
			}, function() {
				zip.finalize(function( written ) {
					// Log statistics
					download_logger.info( JSON.stringify({
						components: that.components,
						build_size: written,
						build_time: new Date() - start
					}) );
					callback( null, "All good!" );
				});
			});
		});
	}
};

module.exports = Builder;
