"use strict";

var fileApi, files, mutex, prim, rjs,
	_ = require( "underscore" ),
	fs = require( "fs" ),
	logger = require( "./simple-log" ).init( "download.jqueryui.com" ),
	path = require( "path" ),
	requirejs = require( "requirejs" );

fileApi = {
	backSlashRegExp: /\\/g,
	exclusionRegExp: /^\./,

	absPath: function( fileName ) {

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

		files[ dest ] = {
			path: dest,
			data: files[ src ].data
		};
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

	getFilteredFileList: function( startDir, regExpFilters, makeUnixPaths ) {
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
			return files[ path ].data.toString( "utf8" );
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

		files[ _path ] = {
			path: _path,
			data: data
		};
	},

	saveUtf8File: function( fileName, fileContents ) {
		fileApi.saveFile( fileName, fileContents );
	}
};

rjs = function( attributes, callback ) {
	var config, localCallback;

	if ( mutex ) {
		throw new Error( "Concurrent calls not supported" );
	}
	mutex = true;
	localCallback = function( error, results ) {
		mutex = false;
		callback( error, results );
	};

	attributes = attributes || {};
	if ( !( "files" in attributes ) ) {
		throw new Error( "missing attributes.files" );
	}
	if ( !( "config" in attributes ) ) {
		throw new Error( "missing attributes.config" );
	}

	files = _.clone( attributes.files.cache );

	requirejs.define( "node/file", [ "prim" ], function( _prim ) {
		prim = _prim;
		return fileApi;
	} );

	requirejs.define( "node/print", [], function() {
		return function print( msg ) {
			logger.log( msg );
			if ( msg.substring( 0, 5 ) === "Error" ) {
				throw new Error( msg );
			}
		};
	} );

	config = _.extend( {}, attributes.config, {
		dir: "dist/build",
		optimize: "none",
		optimizeCss: "none",
		logLevel: 2
	} );

	requirejs.optimize( config, function() {
		var contents,
			fileName = path.resolve( "/" + config.dir, config.modules[ 0 ].name ) + ".js";

		// Remove leftover define created during rjs build
		contents = fileApi.readFile( fileName ).replace( /define\(".*/, "" );

		localCallback( null, contents );
	}, localCallback );
};

module.exports = rjs;
