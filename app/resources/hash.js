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
		// listen to hash changes?
		listen = true,
		listenDelay = 600,
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

	function updateHash( hash, options ) {
		options = options || {};
		if ( options.preventChange === true ) {
			stopListening();
		}
		window.location.hash = hash;
		if ( options.preventChange === true ) {
			storedHash = hash;
			startListening();
		}
	}

	function clean( hash ) {
		return hash.replace( /%23/g, "" ).replace( /[\?#]+/g, "" );
	}

	function currHash() {
		// Can't use window.location.hash, because Firefox automatically decodes it.
		return location.href.split( "#" )[ 1 ];
	}

	function currSearch() {
		return clean( window.location.search );
	}

	function init() {
		if ( currSearch() ) {
			location.href = location.pathname.replace( /\/$/, "" ) + "/#" + currSearch();
		}

		storedHash = "";
		checkHashChange();
	}

	// Export public interface
	exports.Hash = {
		clean: clean,
		init: init,
		on: $.proxy( emitter.on, emitter ),
		off: $.proxy( emitter.off, emitter ),
		update: updateHash
	};
}( this, jQuery, EventEmitter ) );
