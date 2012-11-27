/*jshint jquery: true, browser: true */
/*global EventEmitter: false */
/*!
 * jQuery UI Theme Roller helper JavaScript file for History and hash support
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
;(function( exports, $, EventEmitter, undefined ) {
	/**
	 * History and hash support
	 */
	var currentTabHash = "", // The hash that's only stored on a tab switch
		ee = new EventEmitter(),
		listenDelay = 600,
		listen = true, // listen to hash changes?
		pollInterval = 500,
		poll = null,
		storedHash = "";

	// start listening again
	function startListening() {
		setTimeout(function() {
			listen = true;
		}, listenDelay );
	}

	// stop listening to hash changes
	function stopListening() {
		listen = false;
	}

	// check if hash has changed
	function checkHashChange() {
		var hash = currHash();
		if ( storedHash !== hash ) {
			if ( listen === true ) {
				// update was made by navigation button
				ee.trigger( "change", [ currHash() ] );
			}
			storedHash = hash;
		}

		if ( !poll ) {
			poll = setInterval( checkHashChange, pollInterval );
		}
	}

	function updateHash( hash, ignore ) {
		if ( ignore === true ) {
			stopListening();
		}
		window.location.hash = hash;
		if ( ignore === true ) {
			storedHash = hash;
			startListening();
		}
	}

	function clean( hash ) {
		return hash.replace( /%23/g, "" ).replace( /[\?#]+/g, "" );
	}

	function currHash() {
		return clean( window.location.hash );
	}

	function currSearch() {
		return clean( window.location.search );
	}

	// Export public interface
	exports.Hash = {
		clean: clean,
		init: function() {
			if ( currSearch() ) {
				location.href = "/themeroller/#" + currSearch();
			}

			storedHash = "";
			checkHashChange();
		},
		on: $.proxy( ee.on, ee ),
		off: $.proxy( ee.off, ee ),
		update: updateHash
	};
}( this, jQuery, EventEmitter ) );
