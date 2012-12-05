/*jshint jquery: true, browser: true */
/*global EventEmitter: false */
/*!
 * jQuery UI helper JavaScript file for QueryString support
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( exports, $, undefined ) {
	var QueryString = exports.QueryString = {};

	QueryString.encode = function( obj ) {
		return $.param( obj );
	};

	// Parse 1-depth key=val pairs string. No Arrays supported.
	QueryString.decode = function( querystring ) {
		var obj = {};

		if ( typeof querystring !== "string" || querystring.length === 0 ) {
			return obj;
		}

		$.each( querystring.replace( /\+/g, "%20" ).split( "&" ), function( i, pair ) {
			pair = pair.split( "=" );
			obj[ decodeURIComponent( pair[ 0 ] ) ] = decodeURIComponent( pair[ 1 ] );
		});

		return obj;
	};
}( this, jQuery ) );
