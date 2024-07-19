"use strict";

QUnit.module( "banner" );

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

QUnit.test( "banner", function( assert ) {
	assert.expect( 1 );
	assert.strictEqual( banner( pkg, fileNames ), output, "Banner generated properly" );
} );
