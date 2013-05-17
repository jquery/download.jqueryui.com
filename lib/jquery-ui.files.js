var commonFiles, componentFiles, flatten, testFiles,
	Files = require( "./files" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	sqwish = require( "sqwish" ),
	UglifyJS = require( "uglify-js" ),
	util = require( "./util" ),
	filesCache = {};

flatten = util.flatten;

function replaceVersion( data, version ) {
	return data.replace( /@VERSION/g, version );
}

function readFile( path, version ) {
	var data = fs.readFileSync( path );
	if ( (/(js|css)$/).test( path ) ) {
		data = replaceVersion( data.toString( "utf8" ), version );
	}
	return data;
}

/**
 * JqueryUiFiles
 */
function JqueryUiFiles( jqueryUi ) {
	var cache,
		path = require( "path" );

	this.cache = cache = filesCache[ jqueryUi.path ] = {};
	this.cache.minified = {};

	this.readFile = function( srcpath ) {
		var destpath = srcpath;
		if ( !cache[ destpath ] ) {
			cache[ destpath ] = {
				path: destpath,
				data: readFile( jqueryUi.path + srcpath, jqueryUi.pkg.version )
			};
		}
		return cache[ destpath ];
	};

	this.stripJqueryUiPath = function( filepath ) {
		return path.relative( jqueryUi.path, filepath );
	};
}

JqueryUiFiles.prototype = {
	get: function( filepath ) {
		return this.cache[ filepath ];
	},

	min: function( file ) {
		var minified = this.cache.minified;

		if ( !minified[ file.path ] ) {
			minified[ file.path ] = {
				path: file.path.replace( /\.([^.]*)$/, ".min.$1" )
			};
			if ( (/.js$/i).test( file.path ) ) {
				minified[ file.path ].data = UglifyJS.minify( file.data.toString( "utf8" ), { fromString: true } ).code;
			} else if ( (/.css$/i).test( file.path ) ) {
				minified[ file.path ].data = sqwish.minify( file.data.toString( "utf8" ) );
			}
		}

		return minified[ file.path ];
	}
};

module.exports = JqueryUiFiles;
