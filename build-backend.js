/*jshint node: true */
"use strict";

var spawn = require( "child_process" ).spawn;

function Builder( fields ) {
	this.fields = fields;
}
Builder.prototype = {
	filelist: function() {
		var prefix = "minified/jquery.ui.",
			postfix = ".min.js",
			list = [];
		this.fields.forEach(function( field ) {
			list.push( prefix + field + postfix );
		});
		return list;
	},
	writeTo: function( response, callback ) {
		var that = this;
		var child = spawn( "zip", [ "-r", "-" ].concat( this.filelist() ), { cwd: "dist" } );
		child.stdout.on( "data", function( data) {
			response.write( data );
		});
		child.stderr.on( "data", function( data) {
			console.error( data.toString() );
		});
		child.on( "exit", function( code ) {
			if ( code !== 0 ) {
				callback( "zip failed :(" );
				return;
			}
			callback( null, "All good!" );
		});
	}
};

module.exports = Builder;