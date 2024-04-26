"use strict";

var fs = require( "node:fs/promises" ),
	ThemeRoller = require( "../lib/themeroller" );

module.exports = {
	"test: folder name": {
		"default \"custom-theme\"": function( test ) {
			var customTheme = new ThemeRoller( {
				vars: { ffDefault: "MyCustomFont" }
			} );
			test.ok( customTheme.folderName() === "custom-theme", "Default folder name \"" + customTheme.folderName() + "\" is different from \"custom-theme\"" );
			test.done();
		},

		"default when theme is null \"no-theme\"": function( test ) {
			var theme = new ThemeRoller( {
				vars: null
			} );
			test.ok( theme.folderName() === "no-theme", "Default folder name \"" + theme.folderName() + "\" is different from \"no-theme\"" );
			test.done();
		},

		"custom folder name based on theme's name": function( test ) {
			var theme = new ThemeRoller( {
				vars: { name: "My Name" }
			} );
			test.ok( theme.folderName() === "my-name", "Folder name \"my-name\" expected, but got \"" + theme.folderName() + "\"" );
			test.done();
		},

		"custom folder name": function( test ) {
			var theme = new ThemeRoller( {
				vars: { folderName: "my-name" }
			} );
			test.ok( theme.folderName() === "my-name", "Folder name \"my-name\" expected, but got \"" + theme.folderName() + "\"" );
			test.done();
		}
	}
};

const themeRollerTests = module.exports[ "test: ThemeRoller" ] = {};

( function() {
	function dropThemeUrl( cssSource ) {
		return cssSource.replace( /\n\s*\* To view and modify this theme, visit https?:\/\/jqueryui\.com\/themeroller\/[^\n]+\n/, "\n" );
	}

	[ "1.12.1", "1.13.3" ].forEach( ( jQueryUiVersion ) => {
		let theme;

		themeRollerTests[ `with jQuery UI ${ jQueryUiVersion }` ] = {
			async setUp( callback ) {
				const varsString = await fs.readFile( `${ __dirname }/fixtures/vars/smoothness.json`, "utf-8" );
				const vars = JSON.parse( varsString );

				theme = new ThemeRoller( { vars, version: jQueryUiVersion } );
				callback();
			},

			async [ "should instantiate" ]( test ) {
				test.ok( theme instanceof ThemeRoller );
				test.done();
			},

			async [ "should generate the theme CSS" ]( test ) {
				const smoothnessCssFixture = await fs.readFile( `${ __dirname }/fixtures/jquery-ui-${ jQueryUiVersion }/themes/smoothness.css`, "utf-8" );

				test.equal(
					dropThemeUrl( theme.css() ),
					dropThemeUrl( smoothnessCssFixture )
				);
				test.done();
			},

			async [ "should generate images" ]( test ) {
				theme.generateImages( function( error, images ) {
					try {
						test.strictEqual( error, null );
						test.ok( images && typeof images === "object" );
					} finally {
						test.done();
					}
				} );
			}
		};
	} );

} )();
