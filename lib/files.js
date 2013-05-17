var util = require( "./util" );

function Files() {
	var array = [];
	// Using concat to flatten arguments
	array = array.concat.apply( array, arguments );
	array.__proto__ = Files.prototype;
	return array;
}

Files.prototype = [];

Files.prototype.concat = function() {
	return Files( Array.prototype.concat.apply( this, arguments ) );
};

Files.prototype.filter = function() {
	return Files( Array.prototype.filter.apply( this, arguments ) );
};

Files.prototype.map = function() {
	return Files( Array.prototype.map.apply( this, arguments ) );
};

Files.prototype.slice = function() {
	return Files( Array.prototype.slice.apply( this, arguments ) );
};

Files.prototype.into = function( newSubStrs ) {
	var self = this;
	return util.alwaysArray( newSubStrs ).map(function( newSubStr ) {
		return self.rename.call( self, /^/, newSubStr );
	}).reduce( util.flatten, Files() );
};

Files.prototype.paths = function() {
	return this.map(function( file ) {
		return file.path;
	});
};

Files.prototype.rename = function( regExp, newSubStr ) {
	return this.map(function( file ) {
		return {
			path: file.path.replace( regExp, newSubStr ),
			data: file.data
		};
	});
};

Files.prototype.tee = function( callback ) {
	callback( this.slice() );
	return this;
};

module.exports = Files;
