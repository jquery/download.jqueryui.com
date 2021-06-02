"use strict";

var _basename, bundleJsIntro, bundleI18nIntro, bundleOutro, demoIndexTemplate, docsTemplate, flatten, stripBanner,
	async = require( "async" ),
	banner = require( "./banner" ),
	Files = require( "./files" ),
	fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	path = require( "path" ),
	rjs = require( "./rjs" ),
	sqwish = require( "sqwish" ),
	ThemeRoller = require( "./themeroller" ),
	util = require( "./util" );

bundleJsIntro = "(function( factory ) {\n" +
	"	if ( typeof define === \"function\" && define.amd ) {\n" +
	"\n" +
	"		// AMD. Register as an anonymous module.\n" +
	"		define([ \"jquery\" ], factory );\n" +
	"	} else {\n" +
	"\n" +
	"		// Browser globals\n" +
	"		factory( jQuery );\n" +
	"	}\n" +
	"}(function( $ ) {";

bundleI18nIntro = "(function( factory ) {\n" +
	"	if ( typeof define === \"function\" && define.amd ) {\n" +
	"\n" +
	"		// AMD. Register as an anonymous module.\n" +
	"		define([ \"jquery\" ], factory );\n" +
	"	} else {\n" +
	"\n" +
	"		// Browser globals\n" +
	"		factory( jQuery );\n" +
	"	}\n" +
	"}(function( $ ) {\n" +
	"\n" +
	"var datepicker = $.datepicker;\n";

bundleOutro = "}));";
demoIndexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/demos_index.html", "utf8" ) );
docsTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/docs.html", "utf8" ) );
flatten = util.flatten;
stripBanner = util.stripBanner;

function camelCase( input ) {
	return input.toLowerCase().replace( /[-/](.)/g, function( match, group1 ) {
		return group1.toUpperCase();
	} );
}

function rjsConfig( attributes ) {
	return {
		files: attributes.files,
		config: {
			appDir: "ui",
			baseUrl: ".",
			paths: {
				jquery: "../" + attributes.files.jqueryCore[ 0 ].path.replace( /\.js$/, "" )
			},
			wrap: {
				start: attributes.intro,
				end: bundleOutro
			},
			modules: [ {
				name: "output",
				include: attributes.include,
				exclude: attributes.exclude,
				create: true
			} ],
			onBuildWrite: function( id, path, contents ) {
				var name = camelCase( id.replace( /ui\//, "" ).replace( /\.js$/, "" ) );
				return contents

					// Remove UMD wrapper.
					.replace( /\(function\( factory[\s\S]*?\(function\( [^\)]* \) \{/, "" )
					.replace( /\}\)\);\s*?$/, "" )

					// Replace return exports for var =.
					.replace( /\nreturn/, "\nvar " + name + " =" );
			}
		}
	};
}

/**
 * Builder 1.11
 */
function Builder_1_11_0( build, jqueryUi, components, options, callback ) {
	var _bundleCss, cssComponentFileNames, existingCss, selectedDemoRe, selectedRe, structureCss, structureCssBanner, structureCssMin,
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
	selectedRe = new RegExp( components.join( "|" ) );

	build.files = files;
	build.pkg = jqueryUi.pkg;

	build.commonFiles = files.commonFiles;
	build.componentFiles = files.componentFiles.filter( selected );

	build.componentMinFiles = build.componentFiles.filter( function( file ) {
		return ( /^ui\// ).test( file.path );
	} ).map( min );

	// Bundle CSS (and minified)
	existingCss = function( component ) {
		return files.get( "themes/base/" + component + ".css" ) !== undefined;
	};
	structureCss = components.filter( existingCss ).reduce( function( sum, component ) {
		return sum + stripBanner( files.get( "themes/base/" + component + ".css" ) );
	}, "" );
	structureCssMin = components.filter( existingCss ).reduce( function( sum, component ) {
		return sum + stripBanner( files.min( files.get( "themes/base/" + component + ".css" ) ) );
	}, "" );
	cssComponentFileNames = components.filter( existingCss ).map( function( component ) {
		return component + ".css";
	} );
	if ( options.scope ) {

		// Scope all rules due to specificity issue with tabs (see #gt87)
		structureCss = util.scope( structureCss, options.scope );
		structureCssMin = util.scope( structureCssMin, options.scope );
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
				fileNames = fileNames.concat( "theme.css" );
				options.customThemeUrl = theme.url();
			}
		} else {

			// baseTheme:
			bundleCss = bundleCss + "\n" + theme;
			fileNames = fileNames.concat( "theme.css" );
		}
		return banner( jqueryUi.pkg, fileNames, options ) + bundleCss;
	};
	structureCssBanner = files.baseThemeCss.data.replace( /\*\/[\s\S]*/, "*/" ).replace( /\n.*\n.*themeroller.*/, "" );
	build.structureCss = structureCssBanner + "\n\n" + structureCss;
	build.structureCssMin = banner( jqueryUi.pkg, null, { minify: true } ) + structureCssMin;
	build.bundleCss = function( theme ) {
		return Files( {
			path: "jquery-ui.css",
			data: _bundleCss( structureCss, theme )
		} );
	};
	build.bundleCssMin = function( theme ) {
		return Files( {
			path: "jquery-ui.min.css",
			data: _bundleCss( structureCssMin, theme, { minify: true } )
		} );
	};

	// Ad hoc
	build.jqueryCore = files.jqueryCore;

	// I18n files
	function i18nFiles( callback ) {
		if ( components.indexOf( "datepicker" ) >= 0 ) {
			build.i18nFiles = files.i18nFiles;
			build.i18nMinFiles = files.i18nFiles.map( min );
			async.series( [
				function( callback ) {
					rjs( rjsConfig( {
						files: files,
						intro: bundleI18nIntro,
						include: files.i18nFiles.rename( /ui\//, "" ).rename( /\.js$/, "" ).paths(),
						exclude: [ "jquery", "core", "datepicker" ]
					} ), function( error, data ) {
						if ( error ) {
							return callback( error );
						}
						build.bundleI18n = Files( {
							path: "jquery-ui-i18n.js",
							data: banner( jqueryUi.pkg, files.i18nFiles.paths().map( function( filePath ) {
								return path.basename( filePath );
							} ) ) + data
						} );
						callback();
					} );
				},
				function( callback ) {
					build.bundleI18nMin = Files( {
						path: "jquery-ui-i18n.min.js",
						data: banner( jqueryUi.pkg, files.i18nFiles.paths().map( function( filePath ) {
							return path.basename( filePath );
						} ), { minify: true } ) + stripBanner( files.min( build.bundleI18n[ 0 ], { skipCache: true } ) )
					} );
					callback();
				}
			], callback );
		} else {
			build.i18nFiles = build.i18nMinFiles = build.bundleI18n = build.bundleI18nMin = Files();
			callback();
		}
	}

	// Bundle JS (and minified)
	function bundleJs( callback ) {
		var jsComponentFileNames = components.map( function( component ) {
			return component + ".js";
		} );
		async.series( [
			function( callback ) {
				rjs( rjsConfig( {
					files: files,
					intro: bundleJsIntro,
					include: components,
					exclude: [ "jquery" ]
				} ), function( error, data ) {
					if ( error ) {
						return callback( error );
					}
					build.bundleJs = Files( {
						path: "jquery-ui.js",
						data: banner( jqueryUi.pkg, jsComponentFileNames ) + data
					} );
					callback();
				} );
			},
			function( callback ) {
				build.bundleJsMin = Files( {
					path: "jquery-ui.min.js",
					data: banner( jqueryUi.pkg, jsComponentFileNames, { minify: true } ) + stripBanner( files.min( build.bundleJs[ 0 ], { skipCache: true } ) )
				} );
				callback();
			}
		], callback );
	}

	async.series( [
		i18nFiles,
		bundleJs
	], function( error ) {
		callback( error, build );
	} );
}

module.exports = Builder_1_11_0;
