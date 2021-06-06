"use strict";

var _ = require( "underscore" ),
	util = require( "./util" );

function Files() {
	var array = [];

	// Using concat to flatten arguments
	array = array.concat.apply( array, arguments );
	Object.setPrototypeOf( array, Files.prototype );
	return array;
}

Files.prototype = [];

_.extend( Files.prototype, {
	concat: function() {
		return Files( Array.prototype.concat.apply( this, arguments ) );
	},

	filter: function() {
		return Files( Array.prototype.filter.apply( this, arguments ) );
	},

	map: function() {
		return Files( Array.prototype.map.apply( this, arguments ) );
	},

	slice: function() {
		return Files( Array.prototype.slice.apply( this, arguments ) );
	},

	into: function( newSubStrs ) {
		var self = this;
		return util.alwaysArray( newSubStrs ).map( function( newSubStr ) {
			return self.rename.call( self, /^/, newSubStr );
		} ).reduce( util.flatten, Files() );
	},

	paths: function() {
		return this.map( function( file ) {
			return file.path;
		} );
	},

	rename: function( regExp, newSubStr ) {
		return this.map( function( file ) {
			return {
				path: file.path.replace( regExp, newSubStr ),
				data: file.data
			};
		} );
	},

	tee: function( callback ) {
		callback( this.slice() );
		return this;
	}
} );

module.exports = Files;
