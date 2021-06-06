"use strict";

var fs = require( "fs" ),
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
