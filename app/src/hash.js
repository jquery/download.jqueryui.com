/* eslint-env jquery, browser */
/*global EventEmitter: false */
/*!
 * jQuery UI helper JavaScript file for History and hash support
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
( function( exports, $, EventEmitter, undefined ) {
	"use strict";

	var emitter = new EventEmitter(),

		// listen to hash changes?
		listen = true,
		listenDelay = 600,
		pollInterval = 500,
		poll = null,
		storedHash = "";

	// start listening again
	function startListening() {
		setTimeout( function() {
			listen = true;
		}, listenDelay );
	}

	// stop listening to hash changes
	function stopListening() {
		listen = false;
	}

	function currHash() {

		// Can't use window.location.hash, because Firefox automatically decodes it.
		return location.href.split( "#" )[ 1 ];
	}

	// check if hash has changed
	function checkHashChange() {
		var hash = currHash();
		if ( storedHash !== hash ) {
			if ( listen === true ) {

				// update was made by navigation button
				if ( hash ) {
					hash = hash.replace( /^!*/, "" );
				}
				emitter.trigger( "change", [ hash ] );
			}
			storedHash = hash;
		}

		if ( !poll ) {
			poll = setInterval( checkHashChange, pollInterval );
		}
	}

	function updateHash( hash, options ) {
		options = options || {};
		if ( ( hash == null || hash.length === 0 ) && !( /#/ ).test( location.href ) ) {

			// If setting hash to null, but it has never been set to anything yet, simply do nothing.
			return;
		}
		if ( options.ignoreChange === true ) {
			stopListening();
		}
		window.location.hash = hash.replace( /^!*(.*)/, "!$1" );
		if ( options.ignoreChange === true ) {
			storedHash = hash;
			startListening();
		}
	}

	function clean( hash ) {
		return hash.replace( /^[\?#]+/g, "" );
	}

	function currSearch() {
		return clean( window.location.search );
	}

	function init() {
		storedHash = "";
		checkHashChange();
	}

	if ( currSearch() ) {
		location.href = location.pathname.replace( /\/$/, "" ) + "/#" + currSearch();
	}

	// Export public interface
	exports.Hash = {
		init: init,
		on: $.proxy( emitter.on, emitter ),
		off: $.proxy( emitter.off, emitter ),
		update: updateHash
	};
} )( this, jQuery, EventEmitter );
