var commonFiles, componentFiles, flatten, testFiles,
	Files = require( "./files" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	semver = require( "semver" ),
	sqwish = require( "sqwish" ),
	UglifyJS = require( "uglify-js" ),
	util = require( "./util" ),
	filesCache = {};

flatten = util.flatten;

function isDirectory( filepath ) {
	return fs.statSync( filepath ).isDirectory();
}

function noDirectory( filepath ) {
	return ! fs.statSync( filepath ).isDirectory();
}

commonFiles = [
	"AUTHORS.txt",
	"jquery-*.js",
	"MIT-LICENSE.txt",
	"package.json",
	"README.md",
	"external/*",
	"demos/demos.css",
	"demos/images/*",
	"themes/base/jquery.ui.all.css",
	"themes/base/jquery.ui.base.css",
	"themes/base/jquery.ui.theme.css",
	"themes/base/images/*"
];
componentFiles = [
	"*jquery.json",
	"ui/**",
	"themes/base/jquery*"
];
testFiles = [
	"tests/**",
	"ui/.jshintrc"
];

/**
 * JqueryUiFiles
 */
function JqueryUiFiles( jqueryUi ) {
	var file = function( srcpath ) {
			var destpath = srcpath;
			if ( !filesCache[ jqueryUi.path ][ destpath ] ) {
				filesCache[ jqueryUi.path ][ destpath ] = {
					path: destpath,
					data: readFile( jqueryUi.path + srcpath )
				};
			}
			return filesCache[ jqueryUi.path ][ destpath ];
		},
		path = require( "path" ),
		readFile = function( path ) {
			var data = fs.readFileSync( path );
			if ( (/(js|css)$/).test( path ) ) {
				data = replaceVersion( data.toString( "utf8" ) );
			}
			return data;
		},
		replaceVersion = function( data ) {
			return data.replace( /@VERSION/g, jqueryUi.pkg.version );
		},
		stripJqueryUiPath = function( filepath ) {
			return path.relative( jqueryUi.path, filepath );
		};

	if ( semver.gte( jqueryUi.pkg.version, "1.10.0" ) ) {
		commonFiles.push( "Gruntfile.js" );
	} else {
		commonFiles.push( "grunt.js" );
	}

	this.cache = filesCache[ jqueryUi.path ] = {};
	this.cache.minified = {};

	this.commonFiles = commonFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( file );
	}).reduce( flatten, Files() );

	this.componentFiles = componentFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( file );
	}).reduce( flatten, Files() );

	this.demoFiles = Files( glob( jqueryUi.path + "demos/*/**" ).filter( noDirectory ).map( stripJqueryUiPath ).map( file ) );

	this.docFiles = Files( glob( jqueryUi.path + "docs/*" ).map( stripJqueryUiPath ).map( file ) );

	this.i18nFiles = Files( glob( jqueryUi.path + "ui/i18n/*" ).map( stripJqueryUiPath ).map( file ) );

	this.testFiles = testFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( file );
	}).reduce( flatten, Files() );

	this.baseThemeFiles = Files( glob( jqueryUi.path + "themes/base/**" ).filter( noDirectory ).map( stripJqueryUiPath ).map( file ) );

	this.jqueryCore = Files( glob( jqueryUi.path + "jquery-*" ).map( stripJqueryUiPath ).map( file ) );

	// Auxiliary variables
	this.demoSubdirs = glob( jqueryUi.path + "demos/*" ).filter( isDirectory ).map(function( filepath ) {
		// Get basename only with no trailing slash
		return path.basename( filepath ).replace( /\/$/, "" );
	}).sort();
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
