"use strict";

var banner = require( "../lib/banner" );

function todayDate() {
	return new Date().toISOString().replace( /T.*$$/, "" );
}

var pkg = {
		title: "jQuery UI",
		version: "1.9.0",
		homepage: "http://jqueryui.com",
		author: {
			name: "jQuery Foundation and other contributors"
		},
		licenses: [
			{
				type: "MIT"
			},
			{
				type: "GPL"
			}
		]
	},
	fileNames = [ "jquery.ui.autocomplete.js", "jquery.ui.accordion.js" ],
	output = "/*! jQuery UI - v1.9.0 - " + todayDate() + "\n" +
		"* http://jqueryui.com\n" +
		"* Includes: jquery.ui.autocomplete.js, jquery.ui.accordion.js\n" +
		"* Copyright jQuery Foundation and other contributors; Licensed MIT, GPL */\n\n";

module.exports = {
	"test: case 1": function( test ) {
		test.ok( output === banner( pkg, fileNames ), "Not expected output" );
		test.done();
	}
};
