"use strict";

var demoIndexTemplate, docsTemplate, stripBanner,
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
stripBanner = util.stripBanner;

/**
 * Builder 1.10
 */
function Builder_1_10_0( build, jqueryUi, components, options, callback ) {
	var _bundleCss, baseCss, baseCssMin, cssComponentFileNames, existingCss, jsComponentFileNames, selectedDemoRe, selectedRe,
		files = jqueryUi.files(),
		min = function( file ) {
			return files.min( file );
		},
		selected = function( file ) {
			return components.length && selectedRe.test( file.path );
		},
		selectedDemos = function( filepath ) {
			return components.length && selectedDemoRe.test( filepath );
		};

	options = options || {};
	selectedRe = new RegExp( components.join( "|" ) );

	build.files = files;
	build.pkg = jqueryUi.pkg;

	build.baseTheme = util.stripBanner( files.get( "themes/base/jquery.ui.theme.css" ) );
	build.baseThemeMin = util.stripBanner( files.min( files.get( "themes/base/jquery.ui.theme.css" ) ) );

	build.commonFiles = files.commonFiles;
	build.componentFiles = files.componentFiles.filter( selected );

	build.componentMinFiles = build.componentFiles.filter( function( file ) {
		return ( /^ui\// ).test( file.path );
	} ).map( min );

	build.baseThemeFiles = files.baseThemeFiles;
	build.baseThemeMinFiles = files.baseThemeFiles.filter( selected ).map( min );

	build.baseThemeExceptThemeOrImages = files.baseThemeFiles.filter( function( file ) {
		if ( ( /jquery.ui.theme|jquery-ui|images/ ).test( file.path ) ) {
			return false;
		}
		if ( ( /jquery.ui.all|jquery.ui.base/ ).test( file.path ) ) {
			return true;
		}
		return selected( file );
	} );

	build.baseThemeImages = files.baseThemeFiles.filter( function( file ) {
		return ( /images/ ).test( file.path );
	} );

	// I18n files
	if ( components.indexOf( "datepicker" ) >= 0 ) {
		build.i18nFiles = files.i18nFiles;
		build.i18nMinFiles = files.i18nFiles.map( min );
		build.bundleI18n = Files( {
			path: "jquery-ui-i18n.js",
			data: files.i18nFiles.reduce( function( sum, file ) {
				return sum + stripBanner( file );
			}, banner( jqueryUi.pkg, files.i18nFiles.paths().map( function( filePath ) {
				return path.basename( filePath );
			} ) ) )
		} );
		build.bundleI18nMin = Files( {
			path: "jquery-ui-i18n.min.js",
			data: banner( jqueryUi.pkg, files.i18nFiles.paths().map( function( filePath ) {
				return path.basename( filePath );
			} ), { minify: true } ) +
				stripBanner( files.min( build.bundleI18n[ 0 ], { skipCache: true } ) )
		} );
	} else {
		build.i18nFiles = build.i18nMinFiles = build.bundleI18n = build.bundleI18nMin = Files();
	}

	// Bundle JS (and minified)
	jsComponentFileNames = components.map( function( component ) {
		return "jquery.ui." + component + ".js";
	} );
	build.bundleJs = Files( {
		path: "jquery-ui.js",
		data: build.components.reduce( function( sum, component ) {
			return sum + stripBanner( files.get( "ui/jquery.ui." + component + ".js" ) );
		}, banner( jqueryUi.pkg, jsComponentFileNames ) )
	} );
	build.bundleJsMin = Files( {
		path: "jquery-ui.min.js",
		data: build.components.reduce( function( sum, component ) {
			return sum + stripBanner( files.min( files.get( "ui/jquery.ui." + component + ".js" ) ) );
		}, banner( jqueryUi.pkg, jsComponentFileNames, { minify: true } ) )
	} );

	// Bundle CSS (and minified)
	existingCss = function( component ) {
		return files.get( "themes/base/jquery.ui." + component + ".css" ) !== undefined;
	};
	baseCss = components.filter( existingCss ).reduce( function( sum, component ) {
		return sum + stripBanner( files.get( "themes/base/jquery.ui." + component + ".css" ) );
	}, "" );
	baseCssMin = components.filter( existingCss ).reduce( function( sum, component ) {
		return sum + stripBanner( files.min( files.get( "themes/base/jquery.ui." + component + ".css" ) ) );
	}, "" );
	cssComponentFileNames = components.filter( existingCss ).map( function( component ) {
		return "jquery.ui." + component + ".css";
	} );
	if ( options.scope ) {

		// Scope all rules due to specificity issue with tabs (see #gt87)
		baseCss = util.scope( baseCss, options.scope );
		baseCssMin = util.scope( baseCssMin, options.scope );
	}
	build.baseThemeMinFiles.push( {
		path: "themes/base/jquery.ui.theme.min.css",
		data: banner( jqueryUi.pkg, null, { minify: true } ) + build.baseCssMin
	} );
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
	build.bundleCss = function( theme ) {
		return Files( {
			path: "jquery-ui.css",
			data: _bundleCss( baseCss, theme )
		} );
	};
	build.bundleCssMin = function( theme ) {
		return Files( {
			path: "jquery-ui.min.css",
			data: _bundleCss( baseCssMin, theme, { minify: true } )
		} );
	};

	// Demo files
	if ( components.indexOf( "effect" ) >= 0 ) {
		selectedDemoRe = new RegExp( components.concat( [ "addClass", "animate", "hide", "removeClass", "show", "switchClass", "toggle", "toggleClass" ] ).join( "|" ) );
	} else {
		selectedDemoRe = new RegExp( components.join( "|" ) );
	}
	build.demoFiles = files.demoFiles.filter( function( file ) {
		var componentSubdir = file.path.split( "/" )[ 1 ];
		return selectedDemos( componentSubdir );
	} );
	build.demoFiles.push( {
		path: "demos/index.html",
		data: demoIndexTemplate( {
			demos: files.demoSubdirs.filter( selectedDemos )
		} )
	} );

	// Doc files
	if ( files.docFiles.length ) {
		build.docFiles = files.docFiles.filter( function( file ) {
			return !( /effect/ ).test( file.path );
		} ).filter( selected ).concat( components.filter( function( component ) {
			return ( /effect-/ ).test( component );
		} ).map( function( component ) {
			var path = component.replace( /^effect-(.*)$/, "docs/$1-effect.html" );
			return files.get( path );
		} ) );
		if ( components.indexOf( "effect-scale" ) >= 0 ) {
			build.docFiles.push( files.get( "docs/puff-effect.html" ), files.get( "docs/size-effect.html" ) );
		}
		build.docFiles = build.docFiles.map( function( file ) {
			return {
				path: file.path,
				data: docsTemplate( {
					component: path.basename( file.path ).replace( /\..*/, "" ),
					body: file.data
				} )
			};
		} );
	}

	// Test files
	build.testFiles = files.testFiles;

	// Ad hoc
	build.jqueryCore = files.jqueryCore;

	callback( null, build );
}

module.exports = Builder_1_10_0;
