"use strict";

var indexTemplate,
	amdBuilder = require( "builder-amd" ),
	banner = require( "./banner" ),
	extend = require( "util" )._extend,
	fs = require( "node:fs" ),
	handlebars = require( "handlebars" ),
	jqueryCssBuilder = require( "builder-jquery-css" ),
	path = require( "node:path" ),
	sqwish = require( "sqwish" ),
	ThemeRoller = require( "./themeroller" ),
	semver = require( "semver" ),
	swc = require( "@swc/core" ),
	swcOptions = require( "./swc-options" );

indexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/index.html", "utf8" ) );

function getJsBundleIntro( version ) {
	if ( semver.lt( version, "1.13.0-a" ) ) {
		return "(function( factory ) {\n" +
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
	} else {
		return "( function( factory ) {\n" +
			"	\"use strict\";\n" +
			"\n" +
			"	if ( typeof define === \"function\" && define.amd ) {\n" +
			"\n" +
			"		// AMD. Register as an anonymous module.\n" +
			"		define( [ \"jquery\" ], factory );\n" +
			"	} else {\n" +
			"\n" +
			"		// Browser globals\n" +
			"		factory( jQuery );\n" +
			"	}\n" +
			"} )( function( $ ) {\n" +
			"\"use strict\";\n";
	}
}

function getJsBundleOutro( version ) {
	if ( semver.lt( version, "1.13.0-a" ) ) {
		return "}));";
	} else {
		return "} );";
	}
}

// Switch to native Promise.withResolvers() once Node.js 22 is our baseline.
function getPromiseWithResolvers() {
	let resolve, reject;
	const promise = new Promise( ( res, rej ) => {
		resolve = res;
		reject = rej;
	} );
	return { promise, resolve, reject };
}

function camelCase( input ) {
	return input.toLowerCase().replace( /[-/](.)/g, function( match, group1 ) {
		return group1.toUpperCase();
	} );
}

function stripBanner( data ) {
	if ( data instanceof Buffer ) {
		data = data.toString( "utf8" );
	}
	return data.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
}

/**
 * scope( css, scope )
 * - css [ String ]: CSS content.
 * - scopeString [ String ]: The scope-string that will be added before each css ".ui*" selector.
 *
 * Returns the scoped css.
 */
function scope( css, scopeString ) {
	return css.replace( /(\.ui[^\n,}]*)/g, scopeString + " $1" );
}

function Package( files, runtime ) {
	this.jsBundle = getPromiseWithResolvers();
	this.jsFileNames = runtime.components.map( function( component ) {
		return component + ".js";
	} );
	this.pkgJson = JSON.parse( files[ "package.json" ].toString( "utf-8" ) );
	this.structureCss = getPromiseWithResolvers();
	this.structureCssFileNames = [];
	this.structureMinCss = getPromiseWithResolvers();
	this.themeCss = getPromiseWithResolvers();
	this.themeCssFileNames = [];
	this.themeMinCss = getPromiseWithResolvers();
	this.zipBasedir = "jquery-ui-" + this.pkgJson.version + ".custom";
	this.zipFilename = this.zipBasedir + ".zip";
}

extend( Package.prototype, {
	"AUTHORS.txt": "AUTHORS.txt",
	"LICENSE.txt": "LICENSE.txt",
	"package.json": "package.json",
	"external/jquery/jquery.js": function() {
		if ( !this.runtime.components.length ) {
			return null;
		}
		return this.files[ "external/jquery/jquery.js" ];
	},

	"images": function( callback ) {
		var self = this;

		this.themeCss.promise.then( function( css ) {
			if ( css === null ) {
				return callback( null, null );
			}
			self.themeroller.generateImages( callback );
		} ).catch( callback );
	},

	"index.html": function() {
		var version = this.pkgJson.version;
		if ( !this.runtime.components.length ) {
			return null;
		}
		return indexTemplate( {
			ui: this.runtime.components.reduce( function( sum, component ) {
				sum[ component.replace( /^.+\//, "" ) ] = true;
				return sum;
			}, {} ),
			version: version
		} );
	},

	"jquery-ui.css": function( callback ) {
		var self = this,
			pkgJson = this.pkgJson,
			structureCssFileNames = this.structureCssFileNames,
			themeCssFileNames = this.themeCssFileNames;

		Promise
			.all( [ this.structureCss.promise, this.themeCss.promise ] )
			.then( function( [ structureCss, themeCss ] ) {
				var _banner = banner( pkgJson, structureCssFileNames.concat( themeCssFileNames ), {
					customThemeUrl: self.customThemeUrl
				} );
				themeCss = themeCss ? "\n" + themeCss : "";
				callback( null, _banner + structureCss + themeCss );
			} )
			.catch( callback );
	},

	"jquery-ui.js": function( callback ) {
		var jsBundle = this.jsBundle,
			jsFileNames = this.jsFileNames,
			pkgJson = this.pkgJson;

		if ( !this.runtime.components.length ) {
			return callback( null, null );
		}

		amdBuilder( this.files, {
			appDir: "ui",
			exclude: [ "jquery" ],
			include: this.runtime.components,
			onBuildWrite: ( id, path, contents ) => {
				var name;

				if ( id === "jquery" ) {
					return contents;
				}

				name = camelCase( id.replace( /ui\//, "" ).replace( /\.js$/, "" ) );

				if ( semver.lt( this.pkgJson.version, "1.13.0-a" ) ) {
					return contents

						// Remove UMD wrapper.
						.replace( /\( ?function\( factory[\s\S]*?\( ?function\( [^\)]* \) \{/, "" )
						.replace( /\} ?\) ?\);\s*?$/, "" )

						// Replace return exports for var =.
						.replace( /\nreturn/, "\nvar " + name + " =" );
				} else {
					return contents

						// Remove UMD wrappers of UI & jQuery Color.
						.replace( /\( ?function\( ?(?:root, ?)?factory\b[\s\S]*?\( ?(?:this, ?)?function\( ?[^\)]* ?\) ?\{(?:\s*"use strict";\n)?/, "" )
						.replace( /\} ?\);\s*?$/, "" )

						// Replace return exports for var =.
						.replace( /\nreturn/, "\nvar " + name + " =" );
				}
			},
			optimize: "none",
			useStrict: semver.gte( this.pkgJson.version, "1.13.0-a" ),
			paths: {
				jquery: "../external/jquery/jquery"
			},
			wrap: {
				start: getJsBundleIntro( this.pkgJson.version ),
				end: getJsBundleOutro( this.pkgJson.version )
			}
		}, function( error, js ) {
			var _banner;
			if ( error ) {
				jsBundle.reject( error );
				return callback( error );
			}

			// Remove leftover define created during rjs build
			js = js.replace( /define\(".*/, "" );

			jsBundle.resolve( js );
			_banner = banner( pkgJson, jsFileNames );
			callback( null, _banner + js );
		} );
	},

	"jquery-ui.structure.css": function( callback ) {
		var self = this,
			structureCssFileNames = this.structureCssFileNames,
			runtime = this.runtime,
			structureCss = this.structureCss,
			themeCss = this.themeCss;

		if ( !this.runtime.components.length ) {
			structureCss.resolve( "" );
			return callback( null, null );
		}

		jqueryCssBuilder( this.files, "structure", {
			appDir: "ui",
			include: this.runtime.components,
			onCssBuildWrite: function( _path, data ) {
				if ( data === undefined ) {
					throw new Error( "onCssBuildWrite failed (data is undefined) for path " + _path );
				}
				structureCssFileNames.push( path.basename( _path ) );
				return stripBanner( data );
			},
			paths: {
				jquery: "../external/jquery/jquery"
			}
		}, function( error, css ) {
			if ( error ) {
				structureCss.reject( error );
				return callback( error );
			}

			// Scope all rules due to specificity issue with tabs (see #87)
			if ( runtime.scope ) {
				css = scope( css, runtime.scope );
			}

			structureCss.resolve( css );

			// Add Banner
			themeCss.promise.then( function() {
				var banner = self.files[ "themes/base/theme.css" ]
					.replace( /\*\/[\s\S]*/, "*/" )
					.replace( /\n.*\n.*themeroller.*/, "" );

				banner = banner ? banner + "\n" : "";
				callback( null, banner + css );
			} );
		} );
	},

	"jquery-ui.theme.css": function() {
		var css;

		if ( this.runtime.themeVars === null ) {
			this.themeCss.resolve( null );
			return null;
		}

		this.themeCssFileNames.push( "theme.css" );

		if ( this.runtime.jqueryUi ) {
			this.themeroller = new ThemeRoller( {
				vars: this.runtime.themeVars,
				jqueryUi: this.runtime.jqueryUi
			} );
		} else if ( this.runtime.jQueryUiVersion ) {
			this.themeroller = new ThemeRoller( {
				vars: this.runtime.themeVars,
				version: this.runtime.jQueryUiVersion
			} );
		} else {
			this.themeroller = new ThemeRoller( {
				vars: this.runtime.themeVars
			} );
		}
		this.customThemeUrl = this.themeroller.url();
		css = this.themeroller.css();

		if ( this.runtime.scope ) {
			css = scope( css, this.runtime.scope );
		}

		this.themeCss.resolve( stripBanner( css ) );

		return css;
	},

	"jquery-ui.min.css": function( callback ) {
		var self = this,
			pkgJson = this.pkgJson,
			structureCssFileNames = this.structureCssFileNames,
			themeCssFileNames = this.themeCssFileNames;

		Promise
			.all( [ this.structureMinCss.promise, this.themeMinCss.promise ] )
			.then( function( [ structureMinCss, themeMinCss ] ) {
				var _banner = banner( pkgJson, structureCssFileNames.concat( themeCssFileNames ), {
					customThemeUrl: self.customThemeUrl,
					minify: true
				} );
				themeMinCss = themeMinCss || "";
				callback( null, _banner + structureMinCss + themeMinCss );
			} )
			.catch( callback );
	},

	"jquery-ui.min.js": function( callback ) {
		var jsFileNames = this.jsFileNames,
			pkgJson = this.pkgJson;

		if ( !this.runtime.components.length ) {
			return callback( null, null );
		}

		this.jsBundle.promise.then( function( js ) {
			var _banner = banner( pkgJson, jsFileNames, { minify: true } );
			var minJs = swc.minifySync( js, swcOptions ).code;
			callback( null, _banner + minJs );
		} ).catch( callback );
	},

	"jquery-ui.structure.min.css": function( callback ) {
		var pkgJson = this.pkgJson,
			structureMinCss = this.structureMinCss;

		if ( !this.runtime.components.length ) {
			structureMinCss.resolve();
			return callback( null, null );
		}

		this.structureCss.promise.then( function( css ) {
			var _banner = banner( pkgJson, null, { minify: true } ),
				minCss = sqwish.minify( css );
			structureMinCss.resolve( minCss );
			callback( null, _banner + minCss );
		}, function( error ) {
			structureMinCss.reject( error );
			callback( error );
		} );
	},

	"jquery-ui.theme.min.css": function( callback ) {
		var pkgJson = this.pkgJson,
			themeMinCss = this.themeMinCss;

		this.themeCss.promise.then( function( css ) {
			var _banner, minCss;

			if ( css === null ) {
				themeMinCss.resolve( null );
				return callback( null, null );
			}

			_banner = banner( pkgJson, null, { minify: true } );
			minCss = sqwish.minify( css );
			themeMinCss.resolve( minCss );
			callback( null, _banner + minCss );
		}, function( error ) {
			themeMinCss.reject( error );
			callback( error );
		} );
	}
} );

module.exports = Package;
