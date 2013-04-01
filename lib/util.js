var archiver = require( "archiver" ),
	async = require( "async" ),
	fs = require( "fs" );

module.exports = {
	/**
	 * createZip( files, target, callback )
	 * - files [ Array ]: An array of {data:<data>, path:<path>}'s.
	 * - target [ Stream / String ]: The target stream, or the target filename (when string).
	 * - callback( err, written, elapsedTime ) [ fn ]: callback function.
	 */
	createZip: function( files, target, callback ) {
		var start = new Date(),
			zip = archiver.createZip();
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
				return callback( err, written, new Date() - start );
			});
		});
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
	}
};
