/**
 * requirejs with an additional static method `requirejs.setFiles()` that
 * allows for passing in-memory files. Ideal for applications that build
 * bundles on the fly.
 */

"use strict";

var fileApi, files, mutexLock, prim, queue,
	path = require( "path" ),
	requirejs = require( "requirejs" );

fileApi = {
	backSlashRegExp: /\\/g,
	exclusionRegExp: /^\./,

	absPath: function( /* fileName */ ) {
		// path.charAt( 0 ) must be / or requirejs' nameToUrl will be calculated wrong.
		return "/";
	},

	copyDir: function( srcDir, destDir, regExpFilter ) {
		var destPaths;
		srcDir = path.normalize( srcDir );
		destDir = path.normalize( destDir );
		destPaths = fileApi.getFilteredFileList( srcDir, regExpFilter ).map( function( src ) {
			var dest = src.replace( srcDir, destDir );
			fileApi.copyFile( src, dest );
			return dest;
		} );
		return destPaths.length ? destPaths : null;
	},

	copyFile: function( src, dest ) {

		// Ignore root slash
		src = src.substr( 1 );
		dest = dest.substr( 1 );

		files[ dest ] = files[ src ];
		return true;
	},

	deleteFile: function( path ) {

		// Ignore root slash
		path = path.substr( 1 );
		delete files[ path ];
	},

	exists: function( path ) {

		// Ignore root slash
		path = path.substr( 1 );
		return path in files;
	},

	getFilteredFileList: function( startDir, regExpFilters /*, makeUnixPaths */ ) {
		var regExp, regExpInclude, regExpExclude;

		regExpInclude = regExpFilters.include || regExpFilters;
		regExpExclude = regExpFilters.exclude || null;

		if ( regExpExclude ) {
			throw new Error( "exclude filter not supported" );
		}

		regExp = new RegExp( path.join( startDir, ".*" ) + ( regExpInclude ).toString().replace( /^\//, "" ).replace( /\/$/, "" ) );

		return Object.keys( files ).filter( function( path ) {
			return regExp.test( "/" + path );
		} ).map( function( path ) {
			return "/" + path;
		} );
	},

	normalize: function( fileName ) {
		return path.normalize( fileName );
	},

	readFile: function( path ) {

		// Ignore root slash
		path = path.substr( 1 );

		try {
			return files[ path ].toString( "utf8" );
		} catch ( err ) {
			err.message = "File not found: " + path + "\n" + err.message;
			throw err;
		}
	},

	readFileAsync: function( path ) {
		var deferred = prim();
		try {
			deferred.resolve( fileApi.readFile( path ) );
		} catch ( error ) {
			deferred.reject( error );
		}
		return deferred.promise;
	},

	renameFile: function( from, to ) {
		from = path.normalize( from );
		to = path.normalize( to );

		fileApi.copyFile( from, to );

		// Ignore root slash
		from = from.substr( 1 );

		delete files[ from ];
		return true;
	},

	saveFile: function( _path, data ) {
		_path = path.normalize( _path );

		// Ignore root slash
		_path = _path.substr( 1 );

		files[ _path ] = data;
	},

	saveUtf8File: function( fileName, fileContents ) {
		fileApi.saveFile( fileName, fileContents );
	}
};

queue = [];

function enqueue() {
	queue.push( arguments );
	if ( queue.length === 1 ) {
		run();
	}
}

function dequeue() {
	queue.shift();
	run();
}

function run() {
	var args = queue[ 0 ];
	if ( args !== undefined ) {
		setFiles.apply( {}, args );
	}
}

function setFiles( _files, callback ) {

	if ( mutexLock ) {
		return callback( new Error( "Internal bug: concurrent calls not supported" ) );
	}
	mutexLock = true;

	requirejs.define( "node/file", [ "prim" ], function( _prim ) {
		prim = _prim;
		return fileApi;
	} );

	files = _files;
	callback( function() {
		files = {};
		mutexLock = false;
		dequeue();
	} );

}

/**
 * requirejs.setFiles( files, callback )
 *
 * @files [Object] containing (path, data) key-value pairs, e.g.:
 * {
 *    <path-of-file-1>: <data-of-file-1>,
 *    <path-of-file-2>: <data-of-file-2>,
 *    ...
 * }
 *
 * @callback [Function] called with one argument: a callback function that must be called when
 * use is complete.
 *
 * Example:
 * ```javascript
 * requirejs.setFiles( files, function( done ) {
 *   requirejs.optmize( config, function() {
 *     doSomething();
 *     done();
 *   }, function( error ) {
 *     doSomething( error );
 *     done();
 *   });
 * });
 *
 * ```
 *
 */
requirejs.setFiles = function( files, callback ) {
	enqueue( files, callback );
};

module.exports = requirejs;
