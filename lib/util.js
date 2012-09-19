var Url = require( "url" );

module.exports = {
	// FIXME Shall we use an external lib for this?
	serialize: function param( params ) {
		if ( typeof params == "undefined" ) {
			return "";
		}
		if ( typeof params == "object" && !Array.isArray( params ) ) {
			params = Object.keys( params ).map(function( k ) {
				return [ [ k ], [ params[k] ] ];
			}); 
		}
		return params.map(function( param ) {
			return encodeURIComponent( param[0] ) + "=" + encodeURIComponent( param[1] );
		}).join( "&" ).replace( /%20/g, "+" );
	},
	
	// FIXME Shall we use an external lib for this?
	deserialize: function( url ) {
		var urlParts = Url.parse( url, true );
		return urlParts.query;
	}
};
