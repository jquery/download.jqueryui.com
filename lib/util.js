var archiver = require( "archiver" ),
	fs = require( "fs" ),
	Glob = require( "glob" ).Glob;

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
		var finishEvent = "finish",
			zip = archiver( "zip" );

		if ( typeof target === "string" ) {
			target = fs.createWriteStream( target );
		}

		if ( typeof target.fd !== "undefined" ) {
			finishEvent = "close";
		}

		target.on( finishEvent, function() {
			callback( null, zip.archiver.pointer );
		});

		zip.on( "error", callback );
		zip.pipe( target );

		files.forEach(function( file ) {
			if ( file.data == null ) {
				return callback( new Error( "Zip: missing data of \"" + file.path + "\"" ) );
			}

			zip.addFile( file.data, { name: file.path } );
		});

		zip.finalize();
	},

	flatten: function flatten( flat, arr ) {
		return flat.concat( arr );
	},

	glob: function( pattern ) {
		return new Glob( pattern, { sync: true } ).found;
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
		} catch( err ) {
			err.message += "Failed to strip banner for " + file.path;
			throw err;
		}
	}
};
