"use strict";

var fs = require( "node:fs" ),
	fastGlob = require( "fast-glob" );

module.exports = {
	alwaysArray: function( anythingOrArray ) {
		return Array.isArray( anythingOrArray ) ? anythingOrArray : [ anythingOrArray ];
	},

	flatten: function flatten( flat, arr ) {
		return flat.concat( arr );
	},

	glob: function( pattern, options ) {
		options = options || {};
		return fastGlob.sync( pattern, options );
	},

	isDirectory: function( filepath ) {
		return fs.statSync( filepath ).isDirectory();
	},

	noDirectory: function( filepath ) {
		return !fs.statSync( filepath ).isDirectory();
	},

	optional: function( filepath ) {
		if ( fs.existsSync( filepath ) ) {
			return require( filepath );
		}
	},

	/**
	 * scope( css, scope )
	 * - css [ String ]: CSS content.
	 * - scope [ String ]: The scope-string that will be added before each css ".ui*" selector.
	 *
	 * Returns the scoped css.
	 */
	scope: function( css, scope ) {
		return css.replace( /(\.ui[^\n,}]*)/g, scope + " $1" );
	},

	stripBanner: function( file ) {
		if ( !file ) {
			throw new Error( "Missing 'file' argument" );
		}
		if ( file.data instanceof Buffer ) {
			file.data = file.data.toString( "utf8" );
		}
		try {
			return file.data.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
		} catch ( err ) {
			err.message += "Failed to strip banner for " + file.path;
			throw err;
		}
	}
};
