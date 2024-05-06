"use strict";

var banner = require( "../lib/banner" );

function todayDate() {
	return new Date().toISOString().replace( /T.*$$/, "" );
}

var pkg = {
		title: "jQuery UI",
		version: "1.13.3",
		homepage: "https://jqueryui.com",
		author: {
			name: "OpenJS Foundation and other contributors"
		},
		license: "MIT"
	},
	fileNames = [ "widgets/accordion.js", "widgets/autocomplete.js" ],
	output = "/*! jQuery UI - v1.13.3 - " + todayDate() + "\n" +
		"* https://jqueryui.com\n" +
		"* Includes: widgets/accordion.js, widgets/autocomplete.js\n" +
		"* Copyright OpenJS Foundation and other contributors; Licensed MIT */\n\n";

module.exports = {
	"test: case 1": function( test ) {
		test.ok( output === banner( pkg, fileNames ), "Not expected output" );
		test.done();
	}
};
