"use strict";

QUnit.module( "package" );

let defaultTheme, someWidgets1, someWidgets2,
	commonFiles, COMMON_FILES_TESTCASES,
	themeFiles, THEME_FILES_TESTCASES,
	es5Files, ES5_FILES_TESTCASES;
const JqueryUi = require( "../lib/jquery-ui" );
const Package = require( "../lib/package" );
const Packager = require( "node-packager" );
const themeGallery = require( "../lib/themeroller-themegallery" )();
const { ESLint } = require( "eslint" );

function findFilepath( files, filepath ) {
	const filepathRe = filepath instanceof RegExp ?
		filepath :
		new RegExp(
			filepath
				.replace( /\*/g, "[^\/]*" )
				.replace( /\./g, "\\." )
				.replace( /(.*)/, "^$1$" )
		);
	return Object.keys( files ).find( function( filepath ) {
		return filepathRe.test( filepath );
	} );
}

// An ESLint instance meant just to test if provided files are in ES5.
// Use via the `ensureEs5` function.
const eslintEs5 = new ESLint( {

	// Disable searching for config files
	overrideConfigFile: true,

	overrideConfig: {

		// Match all files. We will run it only on code we want anyway.
		files: [ "*" ],

		languageOptions: {
			ecmaVersion: 5,
			sourceType: "script"
		},

		linterOptions: {
			noInlineConfig: true,
			reportUnusedDisableDirectives: "off",
			reportUnusedInlineConfigs: "off"
		}
	}
} );

async function ensureEs5( contents ) {
	const results = await eslintEs5.lintText( contents );
	if ( results[ 0 ].errorCount === 0 ) {
		return { success: true };
	}

	return {
		success: false,
		message: results[ 0 ].messages.map( msgData => msgData.message ).join( "\n" )
	};
}

defaultTheme = themeGallery[ 0 ].vars;
someWidgets1 = "widget position widgets/autocomplete widgets/button widgets/menu widgets/progressbar widgets/spinner widgets/tabs".split( " " );
someWidgets2 = "widget widgets/mouse position widgets/draggable widgets/resizable widgets/button widgets/datepicker widgets/dialog widgets/slider widgets/tooltip".split( " " );

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
function commonFilesCheck( assert, files ) {
	commonFiles.forEach( function( filepath ) {
		assert.ok( !!findFilepath( files, filepath ), "A common file \"" + filepath + "\" present." );
	} );
}

es5Files = [
	"jquery-ui.js",
	"jquery-ui.min.js"
];
ES5_FILES_TESTCASES = es5Files.length * 2;
async function es5FilesCheck( assert, files ) {
	for ( const filepathPattern of es5Files ) {
		const filepath = findFilepath( files, filepathPattern );
		assert.ok( !!filepath, "A JS file \"" + filepath + "\" present." );
		const lintResult = await ensureEs5( files[ filepath ] );
		assert.ok( lintResult.success, `JS file "${ filepath }" needs to be in ES5 format.${
			lintResult.success ? "" : `Messages from ESLint:\n${ lintResult.message }`
		}` );
	}
}

themeFiles = [
	"jquery-ui.theme.css",
	"jquery-ui.theme.min.css",
	"images/ui-icons*png"
];
THEME_FILES_TESTCASES = themeFiles.length;
function themeFilesCheck( assert, files, theme ) {
	themeFiles.forEach( function( filepath ) {
		if ( theme ) {
			assert.ok( !!findFilepath( files, filepath ), "A theme file \"" + filepath + "\" present." );
		} else {
			assert.ok( !findFilepath( files, filepath ), "The theme file \"" + filepath + "\" not included." );
		}
	} );
}

function runTests( context, jQueryUiVersion ) {

	QUnit.test( `[${ jQueryUiVersion }]: select all components with the default theme`, function( assert ) {
		assert.expect( COMMON_FILES_TESTCASES + ES5_FILES_TESTCASES + THEME_FILES_TESTCASES );

		return new Promise( ( resolve, reject ) => {
			const pkg = new Packager( context.files, Package, {
				components: context.allComponents,
				themeVars: defaultTheme
			} );
			pkg.toJson( async function( error, files ) {
				debugger;
				if ( error ) {
					return reject( error );
				}
				commonFilesCheck( assert, files );
				await es5FilesCheck( assert, files );
				themeFilesCheck( assert, files, true );
				resolve();
			} );
		} );
	} );

	QUnit.test( `[${ jQueryUiVersion }]: select all components with a different theme`, function( assert ) {
		assert.expect( COMMON_FILES_TESTCASES + ES5_FILES_TESTCASES + THEME_FILES_TESTCASES );

		return new Promise( ( resolve, reject ) => {
			const pkg = new Packager( context.files, Package, {
				components: context.allComponents,
				themeVars: themeGallery[ 1 ].vars
			} );
			pkg.toJson( async function( error, files ) {
				if ( error ) {
					return reject( error );
				}
				commonFilesCheck( assert, files );
				await es5FilesCheck( assert, files );
				themeFilesCheck( assert, files, true );
				resolve();
			} );
		} );
	} );

	QUnit.test( `[${ jQueryUiVersion }]: test: select all widgets`, function( assert ) {
		assert.expect( COMMON_FILES_TESTCASES + ES5_FILES_TESTCASES + THEME_FILES_TESTCASES + 2 );

		return new Promise( ( resolve, reject ) => {
			const allWidgets = context.allWidgets;
			const pkg = new Packager( context.files, Package, {
				components: allWidgets,
				themeVars: defaultTheme
			} );
			assert.strictEqual( allWidgets.length, 15, "All widgets count" );
			pkg.toJson( async function( error, files ) {
				if ( error ) {
					return reject( error );
				}
				commonFilesCheck( assert, files );
				await es5FilesCheck( assert, files );
				themeFilesCheck( assert, files, true );

				// 15 widgets, 14 have CSS, plus core, theme, draggable, resizable
				const includes = files[ "jquery-ui.min.css" ].match( /\* Includes: (.+)/ );
				assert.strictEqual( includes[ 1 ].split( "," ).length, 18, allWidgets + " -> " + includes[ 1 ] );

				resolve();
			} );
		} );
	} );

	QUnit.test( `[${ jQueryUiVersion }]: test: select all effects`, function( assert ) {
		assert.expect( COMMON_FILES_TESTCASES + ES5_FILES_TESTCASES + THEME_FILES_TESTCASES + 1 );

		return new Promise( ( resolve, reject ) => {
			const pkg = new Packager( context.files, Package, {
				components: context.allEffects,
				themeVars: null
			} );
			assert.strictEqual( context.allEffects.length, 16, "All effects count" );
			pkg.toJson( async function( error, files ) {
				if ( error ) {
					return reject( error );
				}
				commonFilesCheck( assert, files );
				await es5FilesCheck( assert, files );
				themeFilesCheck( assert, files, false );
				resolve();
			} );
		} );
	} );

	QUnit.test( `[${ jQueryUiVersion }]: select some widgets (1)`, function( assert ) {
		assert.expect( COMMON_FILES_TESTCASES + ES5_FILES_TESTCASES + THEME_FILES_TESTCASES + 2 );

		return new Promise( ( resolve, reject ) => {
			const pkg = new Packager( context.files, Package, {
				components: someWidgets1,
				themeVars: defaultTheme
			} );
			assert.strictEqual( someWidgets1.length, 8, "Some widgets count" );
			pkg.toJson( async function( error, files ) {
				if ( error ) {
					return reject( error );
				}
				commonFilesCheck( assert, files );
				await es5FilesCheck( assert, files );
				themeFilesCheck( assert, files, true );

				// 8 components selected, 6 have CSS, plus core, theme,
				// checkboxradio, controlgroup (tmp button dependencies)
				const includes = files[ "jquery-ui.min.css" ].match( /\* Includes: (.+)/ );
				assert.strictEqual( includes[ 1 ].split( "," ).length, 10, someWidgets1 + " -> " + includes[ 1 ] );

				resolve();
			} );
		} );
	} );

	QUnit.test( `[${ jQueryUiVersion }]: select some widgets (2)`, function( assert ) {
		assert.expect( COMMON_FILES_TESTCASES + ES5_FILES_TESTCASES + THEME_FILES_TESTCASES + 2 );

		return new Promise( ( resolve, reject ) => {
			const pkg = new Packager( context.files, Package, {
				components: someWidgets2,
				themeVars: defaultTheme
			} );
			assert.strictEqual( someWidgets2.length, 10, "Some widgets count" );
			pkg.toJson( async function( error, files ) {
				if ( error ) {
					return reject( error );
				}
				commonFilesCheck( assert, files );
				await es5FilesCheck( assert, files );
				themeFilesCheck( assert, files, true );

				// 10 components selected, 7 have CSS, plus core, theme,
				// checkboxradio, controlgroup (tmp button dependencies)
				const includes = files[ "jquery-ui.min.css" ].match( /\* Includes: (.+)/ );
				assert.strictEqual( includes[ 1 ].split( "," ).length, 11, someWidgets2 + " -> " + includes[ 1 ] );

				resolve();
			} );
		} );
	} );

	QUnit.test( `[${ jQueryUiVersion }]: scope widget CSS`, function( assert ) {
		const filesToCheck = [
			"jquery-ui.css",
			"jquery-ui.min.css"
		];

		assert.expect( filesToCheck.length );

		return new Promise( ( resolve, reject ) => {
			const scope = "#wrapper";
			const scopeRe = new RegExp( scope );
			const pkg = new Packager( context.files, Package, {
				components: context.allComponents,
				themeVars: defaultTheme,
				scope: scope
			} );
			pkg.toJson( function( error, files ) {
				if ( error ) {
					return reject( error );
				}
				filesToCheck.forEach( function( filepath ) {
					assert.ok( scopeRe.test( files[ filepath ] ), "Scope selector on \"" + filepath + "\" present." );
				} );
				resolve();
			} );
		} );
	} );
}

JqueryUi.all().forEach( function( jqueryUi ) {
	const allComponents = jqueryUi.components().map( component => component.name );

	const allEffects = jqueryUi.components()
			.filter( component => component.category === "Effects" )
			.map( component => component.name );

	const allWidgets = jqueryUi.components()
		.filter( component => component.category === "Widgets" )
		.map( component => component.name )
		.sort()

		// unique
		.filter( ( element, i, arr ) => i === arr.indexOf( element ) );

	const files = jqueryUi.files().cache;

	runTests( {
		allComponents: allComponents,
		allEffects: allEffects,
		allWidgets: allWidgets,
		files: files
	}, jqueryUi.pkg.version );
} );
