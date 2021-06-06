// Code from https://github.com/scottgonzalez/simple-log

"use strict";

if ( process.argv.indexOf( "--console" ) !== -1 ) {
	module.exports = {
		init: function() {
			return console;
		}
	};
	return;
}

var format = require( "util" ).format;

module.exports = {
	init: function( name ) {
		var syslog;
		try {
			syslog = require( "modern-syslog" );
			syslog.init( name, syslog.LOG_PID, syslog.LOG_LOCAL0 );

			return {
				log: function() {
					syslog.log( syslog.LOG_INFO, format.apply( null, arguments ) );
				},

				warn: function() {
					syslog.log( syslog.LOG_NOTICE, format.apply( null, arguments ) );
				},

				error: function() {
					syslog.log( syslog.LOG_ERR, format.apply( null, arguments ) );
				}
			};
		} catch ( error ) {
			console.error( "modern-syslog failed to load", error );
			console.info( "Falling back to regular console..." );

			return {
				log: console.log,
				warn: console.warn,
				error: console.error
			};
		}
	}
};
