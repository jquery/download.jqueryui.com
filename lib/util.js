module.exports = {
	/**
	 * scope( css, scope )
	 * - css [ String ]: CSS content.
	 * - scope [ String ]: The scope-string that will be added before each css ".ui*" selector.
	 *
	 * Returns the scoped css.
	 */
	scope: function( css, scope ) {
		return css.replace( /(\.ui[^\n,}]*)/g, scope + " $1" );
	}
};
