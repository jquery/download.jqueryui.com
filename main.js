"use strict";

module.exports = {

	/**
	 * The JqueryUi class.
	 */
	JqueryUi: require( "./lib/jquery-ui" ),

	/**
	 * The Util object.
	 */
	util: require( "./lib/util" ),

  /**
	 * frontend( options )
	 * - options [ Object ]: see `frontend.js` for more details.
	 *
	 * Returns a frontend instance.
	 */
	frontend: function( options ) {
		return new( require( "./frontend" ) )( options );
	},

	/**
	 * themeGallery( jqueryUi )
	 * - jqueryUi [ instanceof JqueryUi ]: see `frontend.js` for more details.
	 *
	 * Returns themeGallery using jqueryUi's version.
	 */
	themeGallery: function( jqueryUi ) {
		return require( "./lib/themeroller-themegallery" )( jqueryUi );
	}
};
