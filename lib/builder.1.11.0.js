var _basename, demoIndexTemplate, docsTemplate, flatten, stripBanner,
	banner = require( "./banner" ),
	Files = require( "./files" ),
	fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	path = require( "path" ),
	sqwish = require( "sqwish" ),
	ThemeRoller = require( "./themeroller" ),
	util = require( "./util" );

demoIndexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/demos_index.html", "utf8" ) );
docsTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/docs.html", "utf8" ) );
flatten = util.flatten;
stripBanner = util.stripBanner;

// Fix path.basename bug: it leaves a trailing slash.
// This has been fixed in nodejs v0.9.6. So, remove this workaround when node baseline gets updated.
_basename = path.basename;
path.basename = function() {
	return _basename.apply( _basename, arguments ).replace( /\/$/, "" );
};

/**
 * Builder 1.11
 */
function Builder_1_11_0( jqueryUi, components, options ) {
	var _bundleCss, baseCss, baseCssMin, cssComponentFileNames, docsCategories, existingCss, jsComponentFileNames, selectedDemoRe, selectedRe,
		files = jqueryUi.files(),
		min = function( file ) {
			return files.min( file );
		},
		selected = function( componentOrFile ) {
			return components.length && selectedRe.test( componentOrFile.name || componentOrFile.path );
		},
		selectedDemos = function( filepath ) {
			return components.length && selectedDemoRe.test( filepath );
		};

	options = options || {};
	components = jqueryUi.expandComponents( components );

	selectedRe = new RegExp( components.join( "|" ) );

	this.components = components;
	this.files = files;
	this.pkg = jqueryUi.pkg;

	this.baseTheme = util.stripBanner( files.get( "themes/base/jquery.ui.theme.css" ) );
	this.baseThemeMin = util.stripBanner( files.min( files.get( "themes/base/jquery.ui.theme.css" ) ) );

	this.commonFiles = files.commonFiles;
	this.componentFiles = files.componentFiles.filter( selected );

	this.componentMinFiles = this.componentFiles.filter(function( file ) {
		return (/^ui\//).test( file.path );
	}).map( min );

	this.baseThemeFiles = files.baseThemeFiles;
	this.baseThemeMinFiles = files.baseThemeFiles.filter( selected ).map( min );
	this.baseThemeMinFiles.push({
		path: "themes/base/jquery.ui.theme.min.css",
		data: banner( jqueryUi.pkg, null, { minify: true } ) + this.baseCssMin
	});

	this.baseThemeExceptThemeOrImages = files.baseThemeFiles.filter(function( file ) {
		if ( (/jquery.ui.theme|jquery-ui|images/).test( file.path ) ) {
			return false;
		}
		if ( (/jquery.ui.all|jquery.ui.base/).test( file.path ) ) {
			return true;
		}
		return selected( file );
	});

	this.baseThemeImages = files.baseThemeFiles.filter(function( file ) {
		return (/images/).test( file.path );
	});

	// I18n files
	if ( components.indexOf( "datepicker" ) >= 0 ) {
		this.i18nFiles = files.i18nFiles;
		this.i18nMinFiles = files.i18nFiles.map( min );
		this.bundleI18n = Files({
			path: "jquery-ui-i18n.js",
			data: files.i18nFiles.reduce(function( sum, file ) {
				return sum + stripBanner( file );
			}, banner( jqueryUi.pkg, files.i18nFiles.paths().map( path.basename ) ) )
		});
		this.bundleI18nMin = Files({
			path: "jquery-ui-i18n.min.js",
			data: banner( jqueryUi.pkg, files.i18nFiles.map( path.basename ), { minify: true }) + stripBanner( files.min( this.bundleI18n[ 0 ] ) )
		});
	} else {
		this.i18nFiles = this.i18nMinFiles = this.bundleI18n = this.bundleI18nMin = Files();
	}

	// Bundle JS (and minified)
	jsComponentFileNames = components.map(function( component ) {
		return "jquery.ui." + component + ".js";
	});
	this.bundleJs = Files({
		path: "jquery-ui.js",
		data: this.components.reduce(function( sum, component ) {
			return sum + stripBanner( files.get( "ui/jquery.ui." + component + ".js" ) );
		}, banner( jqueryUi.pkg, jsComponentFileNames ) )
	});
	this.bundleJsMin = Files({
		path: "jquery-ui.min.js",
		data: this.components.reduce(function( sum, component ) {
			return sum + stripBanner( files.min( files.get( "ui/jquery.ui." + component + ".js" ) ) );
		}, banner( jqueryUi.pkg, jsComponentFileNames, { minify: true } ) )
	});

	// Bundle CSS (and minified)
	existingCss = function( component ) {
		return files.get( "themes/base/jquery.ui." + component + ".css" ) !== undefined;
	};
	baseCss = components.filter( existingCss ).reduce(function( sum, component ) {
		return sum + stripBanner( files.get( "themes/base/jquery.ui." + component + ".css" ) );
	}, "" );
	baseCssMin = components.filter( existingCss ).reduce(function( sum, component ) {
		return sum + stripBanner( files.min( files.get( "themes/base/jquery.ui." + component + ".css" ) ) );
	}, "" );
	cssComponentFileNames = components.filter( existingCss ).map(function( component ) {
		return "jquery.ui." + component + ".css";
	});
	if ( options.scope ) {
		// Scope all rules due to specificity issue with tabs (see #gt87)
		baseCss = util.scope( baseCss, options.scope );
		baseCssMin = util.scope( baseCssMin, options.scope );
	}
	_bundleCss = function( base, theme, options ) {
		var bundleCss = base,
			fileNames = cssComponentFileNames;
		options = options || {};
		if ( theme instanceof ThemeRoller ) {
			// customTheme:
			if ( !theme.isNull ) {
				if ( options.minify ) {
					bundleCss = bundleCss + sqwish.minify( stripBanner( { data: theme.css() } ) );
				} else {
					bundleCss = bundleCss + "\n" + stripBanner( { data: theme.css() } );
				}
				fileNames = fileNames.concat( "jquery.ui.theme.css" );
				options.customThemeUrl = theme.url();
			}
		} else {
			// baseTheme:
			bundleCss = bundleCss + "\n" + theme;
			fileNames = fileNames.concat( "jquery.ui.theme.css" );
		}
		return banner( jqueryUi.pkg, fileNames, options ) + bundleCss;
	};
	this.bundleCss = function( theme ) {
		return Files({
			path: "jquery-ui.css",
			data: _bundleCss( baseCss, theme )
		});
	};
	this.bundleCssMin = function( theme ) {
		return Files({
			path: "jquery-ui.min.css",
			data: _bundleCss( baseCssMin, theme, { minify: true } )
		});
	};

	// Demo files
	selectedDemoRe = new RegExp( components.join( "|" ) );
	this.demoFiles = files.demoFiles.filter(function( file ) {
		var componentSubdir = file.path.split( "/" )[ 1 ];
		return selectedDemos( componentSubdir );
	});
	this.demoFiles.push({
		path: "demos/index.html",
		data: demoIndexTemplate({
			demos: files.demoSubdirs.filter( selectedDemos )
		})
	});

	// Doc files
	if ( files.docFiles.length ) {
		this.docFiles = jqueryUi.components().filter( selected ).map(function( component ) {
			return component.docs;
		}).map(function( doc ) {
			var slug;
			// Expand categories's pages and posts
			if ( (/\/category\//).test( doc ) ) {
				slug = path.basename( doc );
				return files.docsCategories[ slug ].posts;
			}
			return doc;
		}).reduce( flatten, [] ).reduce(function( sum, doc ) {
			var filename = path.basename( doc ) + ".html",
				file = files.get( path.join( "docs", filename ) );
			if ( file ) {
				sum.push({
					path: file.path,
					data: docsTemplate({
						component: path.basename( file.path ).replace( /\..*/, "" ),
						body: file.data
					})
				});
			}
			return sum;
		}, Files() );
	}

	// Test files
	this.testFiles = files.testFiles;

	// Ad hoc
	this.jqueryCore = files.jqueryCore;
}

module.exports = Builder_1_11_0;
