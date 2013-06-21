module.exports = {
	/**
	 * The Builder class.
	 */
	Builder: require( "./lib/builder" ),

	/**
	 * The JqueryUi class.
	 */
	JqueryUi: require( "./lib/jquery-ui" ),

	/**
	 * The JqueryUi class.
	 */
	Packer: require( "./lib/packer" ),

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
		return new ( require( "./frontend" ) )( options );
	},

	/**
	 * themeGallery( jqueryUi )
	 * - jqueryUi [ instanceof JqueryUi ]: see `frontend.js` for more details.
	 *
	 * Returns themeGallery using jqueryUi's version.
	 */
	themeGallery: function( jqueryUi ) {
		return require( "./lib/themeroller.themegallery" )( jqueryUi );
	}
};
