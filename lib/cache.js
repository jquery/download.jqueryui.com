"use strict";

var Cache, cacheCron, cacheCronTimeout, cacheExpiresTime, caches,
	logger = require( "./simple-log" ).init( "download.jqueryui.com" );

cacheExpiresTime = 0;
caches = [];

cacheCron = function() {
	var currentTime = Date.now();
	caches.forEach( function( cache ) {
		var count = {
			cached: 0,
			deleted: 0
		};

		cache.each( function( value, key ) {
			count.cached++;
			if ( cache.expires[ key ] < currentTime ) {
				cache.destroy( key );
				count.deleted++;
			}
		} );

		logger.log( cache.name + " Cleanup:", count );
	} );
	cacheCronTimeout = setTimeout( cacheCron, cacheExpiresTime );
};

Cache = function( name ) {
	this.cache = {};
	this.expires = {};
	this.name = name;
	caches.push( this );
};

Cache.on = function( expiresTime ) {
	cacheExpiresTime = expiresTime;
	clearTimeout( cacheCronTimeout );
	cacheCron();
};

Cache.prototype = {
	destroy: function( key ) {
		delete this.cache[ key ];
	},

	each: function( callback ) {
		var key;
		for ( key in this.cache ) {
			callback( this.cache[ key ], key );
		}
	},

	get: function( key ) {
		var value = this.cache[ key ];
		if ( value ) {
			this.setExpire( key );
		}
		return value;
	},

	set: function( key, value ) {
		if ( cacheExpiresTime ) {
			this.cache[ key ] = value;
			this.setExpire( key );
		}
	},

	setExpire: function( key ) {
		this.expires[ key ] = Date.now() + cacheExpiresTime;
	}
};

module.exports = Cache;
