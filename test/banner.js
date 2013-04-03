var banner = require( "../lib/banner.js" ),
  dateformat = require( "dateformat" );

function today(format) {
	return dateformat(new Date(), format);
}

var pkg = {
		title: "jQuery UI",
		version: "1.9.0",
		homepage: "http://jqueryui.com",
		author: {
			name: "authors.txt"
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
	output = "/*! jQuery UI - v1.9.0 - " + today( "isoDate" ) + "\n" +
		"* http://jqueryui.com\n" +
		"* Includes: jquery.ui.autocomplete.js, jquery.ui.accordion.js\n" +
		"* Copyright " + today( "yyyy" ) + " authors.txt; Licensed MIT, GPL */\n\n";

module.exports = {
	"test: case 1": function( test ) {
		test.ok( output === banner( pkg, fileNames ), "Not expected output" );
		test.done();
	}
};
