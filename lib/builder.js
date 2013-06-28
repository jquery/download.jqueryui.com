var Builder_1_10_0 = require( "./builder.1.10.0.js" ),
	Builder_1_11_0 = require( "./builder.1.11.0.js" ),
	semver = require( "semver" );

/**
 * Builder( jqueryUi, components, options )
 * - jqueryUi [ instanceof JqueryUi ]: jQuery UI object.
 * - components [ Array / String ]: Array with the component names, or a special string ":all:" that selects all the components.
 * - options: details below.
 *
 * options:
 * - scope [ String ]: Insert a scope string on the css selectors.
 */
function Builder( jqueryUi, components, options ) {
	// FIXME s/1.11.0pre/1.11.0
	if ( semver.gte( jqueryUi.pkg.version, "1.11.0pre" ) ) {
		Builder_1_11_0.apply( this, arguments );
	} else {
		Builder_1_10_0.apply( this, arguments );
	}
}

Builder.prototype = {
	get: function( file ) {
		return this.files.get( file );
	}
};

module.exports = Builder;
