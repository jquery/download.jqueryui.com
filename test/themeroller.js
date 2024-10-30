"use strict";

const fs = require( "node:fs/promises" );
const ThemeRoller = require( "../lib/themeroller" );

QUnit.module( "themeroller", function() {

	QUnit.test( "folder name: default \"custom-theme\"", function( assert ) {
		assert.expect( 1 );
		const customTheme = new ThemeRoller( {
			vars: { ffDefault: "MyCustomFont" }
		} );
		assert.strictEqual( customTheme.folderName(), "custom-theme", "Default folder name" );
	} );

	QUnit.test( "folder name: default when theme is null \"no-theme\"", function( assert ) {
		assert.expect( 1 );
		const theme = new ThemeRoller( {
			vars: null
		} );
		assert.strictEqual( theme.folderName(), "no-theme", "Default folder name" );
	} );

	QUnit.test( "folder name: custom folder name based on theme's name", function( assert ) {
		assert.expect( 1 );
		const theme = new ThemeRoller( {
			vars: { name: "My Name" }
		} );
		assert.strictEqual( theme.folderName(), "my-name", "Default folder name" );
	} );

	QUnit.test( "folder name: custom folder name", function( assert ) {
		assert.expect( 1 );
		const theme = new ThemeRoller( {
			vars: { folderName: "my-name" }
		} );
		assert.strictEqual( theme.folderName(), "my-name", "Default folder name" );
	} );

	( function() {
		function dropThemeUrl( cssSource ) {
			return cssSource.replace( /\n\s*\* To view and modify this theme, visit https?:\/\/jqueryui\.com\/themeroller\/[^\n]+\n/, "\n" );
		}

		[ "1.12.1", "1.13.3", "1.14.1" ].forEach( ( jQueryUiVersion ) => {
			let theme;

			QUnit.module( `with jQuery UI ${ jQueryUiVersion }`, function( hooks ) {
				hooks.beforeEach( async function setUp() {
					const varsString = await fs.readFile( `${ __dirname }/fixtures/vars/smoothness.json`, "utf-8" );
					const vars = JSON.parse( varsString );

					theme = new ThemeRoller( { vars, version: jQueryUiVersion } );
				} );

				QUnit.test( "should instantiate", function( assert ) {
					assert.expect( 1 );
					assert.ok( theme instanceof ThemeRoller, "Instance of ThemeRoller" );
				} );

				QUnit.test( "should generate the theme CSS", async function( assert ) {
					assert.expect( 1 );

					const smoothnessCssFixture = await fs.readFile( `${ __dirname }/fixtures/jquery-ui-${ jQueryUiVersion }/themes/smoothness.css`, "utf-8" );

					assert.strictEqual(
						dropThemeUrl( theme.css() ),
						dropThemeUrl( smoothnessCssFixture ),
						"Theme CSS generated properly"
					);
				} );

				QUnit.test( "should generate images", function( assert ) {
					assert.expect( 2 );
					const done = assert.async();

					theme.generateImages( function( error, images ) {
						try {
							assert.strictEqual( error, null, "No errors" );
							assert.strictEqual( images && typeof images, "object", "An object generated" );
						} finally {
							done();
						}
					} );
				} );
			} );
		} );

	} )();
} );
