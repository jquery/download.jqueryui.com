"use strict";

var commonFiles, COMMON_FILES_TESTCASES, defaultTheme, newPackage, someWidgets1, someWidgets2, tests, themeFiles, THEME_FILES_TESTCASES,
	async = require( "async" ),
	JqueryUi = require( "../lib/jquery-ui" ),
	Package = require( "../lib/package-1-13" ),
	Packager = require( "node-packager" ),
	semver = require( "semver" ),
	themeGallery = require( "../lib/themeroller-themegallery" )();

function filePresent( files, filepath ) {
	var filepathRe = filepath instanceof RegExp ? filepath : new RegExp( filepath.replace( /\*/g, "[^\/]*" ).replace( /\./g, "\\." ).replace( /(.*)/, "^$1$" ) );
	return Object.keys( files ).some( function( filepath ) {
		return filepathRe.test( filepath );
	} );
}

defaultTheme = themeGallery[ 0 ].vars;
someWidgets1 = "widget core position widgets/autocomplete widgets/button widgets/menu widgets/progressbar widgets/spinner widgets/tabs".split( " " );
someWidgets2 = "widget core widgets/mouse position widgets/draggable widgets/resizable widgets/button widgets/datepicker widgets/dialog widgets/slider widgets/tooltip".split( " " );

commonFiles = [
	"external/jquery/jquery.js",
	"index.html",
	"jquery-ui.css",
	"jquery-ui.js",
	"jquery-ui.min.css",
	"jquery-ui.min.js",
	"jquery-ui.structure.css",
	"jquery-ui.structure.min.css"
];
COMMON_FILES_TESTCASES = commonFiles.length;
function commonFilesCheck( test, files ) {
	commonFiles.forEach( function( filepath ) {
		test.ok( filePresent( files, filepath ), "Missing a common file \"" + filepath + "\"." );
	} );
}

themeFiles = [
	"jquery-ui.theme.css",
	"jquery-ui.theme.min.css",
	"images/ui-icons*png"
];
THEME_FILES_TESTCASES = themeFiles.length;
function themeFilesCheck( test, files, theme ) {
	themeFiles.forEach( function( filepath ) {
		if ( theme ) {
			test.ok( filePresent( files, filepath ), "Missing a theme file \"" + filepath + "\"." );
		} else {
			test.ok( !filePresent( files, filepath ), "Should not include the theme file \"" + filepath + "\"." );
		}
	} );
}

tests = {
	"test: select all components": {
		"with the default theme": function( test ) {
			var pkg = new Packager( this.files, Package, {
				components: this.allComponents,
				themeVars: defaultTheme
			} );
			test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES );
			pkg.toJson( function( error, files ) {
				if ( error ) {
					return test.done( error );
				}
				commonFilesCheck( test, files );
				themeFilesCheck( test, files, true );
				test.done();
			} );
		},
		"with a different theme": function( test ) {
			var pkg = new Packager( this.files, Package, {
				components: this.allComponents,
				themeVars: themeGallery[ 1 ].vars
			} );
			test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES );
			pkg.toJson( function( error, files ) {
				if ( error ) {
					return test.done( error );
				}
				commonFilesCheck( test, files );
				themeFilesCheck( test, files, true );
				test.done();
			} );
		}
	},
	"test: select all widgets": function( test ) {
		var allWidgets = this.allWidgets;
		var pkg = new Packager( this.files, Package, {
			components: allWidgets,
			themeVars: defaultTheme
		} );
		test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES + 2 );
		test.equal( allWidgets.length, 15 );
		pkg.toJson( function( error, files ) {
			if ( error ) {
				return test.done( error );
			}
			commonFilesCheck( test, files );
			themeFilesCheck( test, files, true );

			// 15 widgets, 14 have CSS, plus core, theme, draggable, resizable
			var includes = files[ "jquery-ui.min.css" ].match( /\* Includes: (.+)/ );
			test.equal( includes[ 1 ].split( "," ).length, 18, allWidgets + " -> " + includes[ 1 ] );

			test.done();
		} );
	},
	"test: select all effects": function( test ) {
		var pkg = new Packager( this.files, Package, {
			components: this.allEffects,
			themeVars: null
		} );
		test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES + 1 );
		test.equal( this.allEffects.length, 16 );
		pkg.toJson( function( error, files ) {
			if ( error ) {
				return test.done( error );
			}
			commonFilesCheck( test, files );
			themeFilesCheck( test, files, false );
			test.done();
		} );
	},
	"test: select some widgets (1)": function( test ) {
		var pkg = new Packager( this.files, Package, {
			components: someWidgets1,
			themeVars: defaultTheme
		} );
		test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES + 2 );
		test.equal( someWidgets1.length, 9 );
		pkg.toJson( function( error, files ) {
			if ( error ) {
				return test.done( error );
			}
			commonFilesCheck( test, files );
			themeFilesCheck( test, files, true );

			// 9 components selected, 6 have CSS, plus core, theme,
			// checkboxradio, controlgroup (tmp button dependencies)
			var includes = files[ "jquery-ui.min.css" ].match( /\* Includes: (.+)/ );
			test.equal( includes[ 1 ].split( "," ).length, 10, someWidgets1 + " -> " + includes[ 1 ] );

			test.done();
		} );
	},
	"test: select some widgets (2)": function( test ) {
		var pkg = new Packager( this.files, Package, {
			components: someWidgets2,
			themeVars: defaultTheme
		} );
		test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES + 2 );
		test.equal( someWidgets2.length, 11 );
		pkg.toJson( function( error, files ) {
			if ( error ) {
				return test.done( error );
			}
			commonFilesCheck( test, files );
			themeFilesCheck( test, files, true );

			// 11 components selected, 7 have CSS, plus core, theme,
			// checkboxradio, controlgroup (tmp button dependencies)
			var includes = files[ "jquery-ui.min.css" ].match( /\* Includes: (.+)/ );
			test.equal( includes[ 1 ].split( "," ).length, 11, someWidgets2 + " -> " + includes[ 1 ] );

			test.done();
		} );
	},
	"test: scope widget CSS": function( test ) {
		var pkg,
			filesToCheck = [
				"jquery-ui.css",
				"jquery-ui.min.css"
			],
			scope = "#wrapper",
			scopeRe = new RegExp( scope );
		pkg = new Packager( this.files, Package, {
			components: this.allComponents,
			themeVars: defaultTheme,
			scope: scope
		} );
		test.expect( filesToCheck.length );
		pkg.toJson( function( error, files ) {
			if ( error ) {
				return test.done( error );
			}
			filesToCheck.forEach( function( filepath ) {
				test.ok( scopeRe.test( files[ filepath ] ), "Missing scope selector on \"" + filepath + "\"." );
			} );
			test.done();
		} );
	}
};

JqueryUi.all().filter( function( jqueryUi ) {

	// Filter supported releases only
	return semver.gte( jqueryUi.pkg.version, "1.13.0-a" );
} ).forEach( function( jqueryUi ) {
	function deepTestBuild( obj, tests ) {
		var allComponents = jqueryUi.components().map( function( component ) {
				return component.name;
			} ),
			allEffects = jqueryUi.components().filter( function( component ) {
				return component.category === "Effects";
			} ).map( function( component ) {
				return component.name;
			} ),
			allWidgets = jqueryUi.components().filter( function( component ) {
				return component.category === "Widgets";
			} ).map( function( component ) {
				return [ component.name ];
			} ).reduce( function( flat, arr ) {
				return flat.concat( arr );
			}, [] ).sort().filter( function( element, i, arr ) {

				// unique
				return i === arr.indexOf( element );
			} ),
			files = jqueryUi.files().cache;
		Object.keys( tests ).forEach( function( i ) {
			if ( typeof tests[ i ] === "object" ) {
				obj[ i ] = {};
				deepTestBuild( obj[ i ], tests[ i ] );
			} else {
				obj[ i ] = function( test ) {
					tests[ i ].call( {
						allComponents: allComponents,
						allEffects: allEffects,
						allWidgets: allWidgets,
						files: files
					}, test );
				};
			}
		} );
	}
	module.exports[ jqueryUi.pkg.version ] = {};
	deepTestBuild( module.exports[ jqueryUi.pkg.version ], tests );
} );
