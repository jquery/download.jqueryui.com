/*jshint node: true */
"use strict";

var spawn = require( "child_process" ).spawn,
	fs = require( "fs" ),
	rimraf = require( "rimraf" ),
	async = require( "async" );

function Builder( fields ) {
	this.fields = fields;
}
Builder.prototype = {
	build: function( callback ) {
		var tmpdir = "tmp" + (+new Date()),
			target = "jquery-ui-custom",
			targetdir = tmpdir + "/" + target + "/";
		fs.mkdirSync( tmpdir );
		fs.mkdirSync( targetdir );
		fs.mkdirSync( targetdir + "minified" );
		fs.writeFileSync( targetdir + "version.txt", "custom" );
		this.fields.forEach(function( field ) {
			var file = "minified/jquery.ui." + field + ".min.js";
			fs.writeFileSync( targetdir + file, fs.readFileSync( "dist/" + file ) );
		});
		callback( tmpdir, target );
	},
	writeTo: function( response, callback ) {
		var that = this;
		this.build(function( cwd, target ) {
			var child = spawn( "zip", [ "-r", "-", target ], { cwd: cwd } );
			child.stdout.on( "data", function( data) {
				response.write( data );
			});
			child.stderr.on( "data", function( data) {
				console.error( data.toString() );
			});
			child.on( "exit", function( code ) {
				rimraf.sync( cwd );
				if ( code !== 0 ) {
					callback( "zip failed :(" );
					return;
				}
				callback( null, "All good!" );
			});
		});
	}
};

module.exports = Builder;