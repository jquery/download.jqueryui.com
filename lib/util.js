var archiver = require( "archiver" ),
	async = require( "async" ),
	fs = require( "fs" );

module.exports = {
	alwaysArray: function( anythingOrArray ) {
		return Array.isArray( anythingOrArray ) ? anythingOrArray : [ anythingOrArray ];
	},

	/**
	 * createZip( files, target, callback )
	 * - files [ Array ]: An array of {data:<data>, path:<path>}'s.
	 * - target [ Stream / String ]: The target stream, or the target filename (when string).
	 * - callback( err, written ) [ fn ]: callback function.
	 */
	createZip: function( files, target, callback ) {
		var zip = archiver.createZip();
		if ( typeof target === "string" ) {
			target = fs.createWriteStream( target );
		}
		zip.pipe( target );
		async.forEachSeries( files, function( file, next ) {
			if ( file.data == null ) {
				return next( new Error( "Zip: missing data of \"" + file.path + "\"" ) );
			}
			zip.addFile( file.data, { name: file.path }, next );
		}, function( err ) {
			if ( err ) {
				return callback( err );
			}
			zip.finalize(function( err, written ) {
				return callback( err, written );
			});
		});
	},

	flatten: function flatten( flat, arr ) {
		return flat.concat( arr );
	},

	isDirectory: function( filepath ) {
		return fs.statSync( filepath ).isDirectory();
	},

	noDirectory: function( filepath ) {
		return !fs.statSync( filepath ).isDirectory();
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
		if ( file.data instanceof Buffer ) {
			file.data = file.data.toString( "utf8" );
		}
		try {
			return file.data.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
		} catch( err ) {
			err.message += "Ops for " + file.path + ".\n";
			throw err;
		}
	}
};
