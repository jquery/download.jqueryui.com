/*jshint jquery: true, browser: true */
/*global EventEmitter: false */
/*!
 * jQuery UI helper JavaScript file for History and hash support
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( exports, $, EventEmitter, undefined ) {
	var emitter = new EventEmitter(),
		listenDelay = 600,
		// listen to hash changes?
		listen = true,
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
				emitter.trigger( "change", [ currHash() ] );
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
		on: $.proxy( emitter.on, emitter ),
		off: $.proxy( emitter.off, emitter ),
		update: updateHash
	};
}( this, jQuery, EventEmitter ) );
