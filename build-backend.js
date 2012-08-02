var async = require( "async" ),
	banner = require( "./banner" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	handlebars = require( "handlebars" ),
	spawn = require( "child_process" ).spawn,
	winston = require( "winston" ),
	zipstream = require( "zipstream" );

var input = glob( "versions/*" )[0];

var indexTemplate = handlebars.compile( fs.readFileSync( "zip-index.html", "utf8" ) ),
	pkg = JSON.parse( fs.readFileSync( input + "/package.json" ) ),
	cache = {},
	commonFiles = [],
	componentFiles = [],
	demoFiles = [],
	imageFiles = {},
	jqueryFilename;

var download_logger = new winston.Logger({
		transports: [
			new winston.transports.File({
				filename: "downloads.log",
				json: false
			})
		]
	});

function stripBanner( src ) {
	if ( src instanceof Buffer ) {
		src = src.toString( "utf-8" );
	}
	return src.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
}

function cacheIt( filepath ) {
	cache[ filepath ] = fs.readFileSync( input + filepath );
}

/**
 * Build cache
 */

var flatten = function( flat, arr ) {
		return flat.concat( arr );
	},
	noDirectory = function( filepath ) {
		return ! fs.statSync( filepath ).isDirectory();
	},
	stripInput = function( filepath ) {
		return filepath.replace( input, "" );
	};

// Common files
commonFiles = [
	"/*",
	"/external/*",
	"/demos/demos.css",
	"/demos/images/*",
	"/themes/base/images/*",
	"/themes/base/minified/images/*"
].map(function( path ) {
	return glob( input + path ).filter( noDirectory ).map( stripInput ).filter(function( filepath ) {
		return ! (/^MANIFEST$|\.jquery\.json$/).test( filepath );
	});
}).reduce( flatten, [] );

// Component files
componentFiles = [
	"/*jquery.json",
	"/ui/**",
	"/themes/base/jquery*",
	"/themes/base/minified/jquery*"
].map(function( path ) {
	return glob( input + path ).filter( noDirectory ).map( stripInput );
}).reduce( flatten, [] );

// Demo files
demoFiles = glob( input + "/demos/*/**" ).filter( noDirectory ).map( stripInput );

// Cache them
commonFiles.forEach( cacheIt );
componentFiles.forEach( cacheIt );
demoFiles.forEach( cacheIt );

// Auxiliary variables
imageFiles = glob( input + "/themes/base/images/*" ).map( stripInput );
jqueryFilename = stripInput( glob( input + "/jquery-*" )[ 0 ] );


/**
 * Builder
 */
function Builder( fields ) {
	var cssHeader, existingCss, header;

	this.basedir = "jquery-ui-" + pkg.version + ".custom";
	this.fields = fields;
	this.ui = this.fields.reduce(function( sum, field ) {
		sum[ field ] = true;
		return sum;
	}, {});
	this.ui.version = pkg.version;

	header = banner( pkg, this.fields.map(function( field ) {
		return "jquery.ui." + field + ".js";
	}) ) + "\n";
	this.full = this.fields.reduce(function( sum, field ) {
		return sum + stripBanner( cache[ "ui/jquery.ui." + field + ".js" ] );
	}, header );
	this.min = this.fields.reduce(function( sum, field ) {
		return sum + stripBanner( cache[ "ui/minified/jquery.ui." + field + ".min.js" ] );
	}, header );

	existingCss = function( field ) {
		return cache[ "themes/base/jquery.ui." + field + ".css" ] !== undefined;
	};
	cssHeader = banner( pkg, this.fields.filter( existingCss ).map(function( field ) {
		return "jquery.ui." + field + ".css";
	}) ) + "\n";
	this.cssFull = this.fields.reduce(function( sum, field ) {
		return sum + stripBanner( cache[ "themes/base/jquery.ui." + field + ".css" ] || "" );
	}, cssHeader );
	this.cssMin = this.fields.reduce(function( sum, field ) {
		return sum + stripBanner( cache[ "themes/base/minified/jquery.ui." + field + ".min.css" ] || "" );
	}, cssHeader );
}

Builder.prototype = {
	/**
	 * Generates a build array [ <build-item>, ... ], where
	 * build-item = {
	 *   path: String:package destination filepath,
	 *   data: String/Buffer:the content itself
	 * }
	 */
	build: function( callback ) {
		var add = function( src, dst ) {
				build.push({
					path: [ basedir ].concat( dst ).join( "/" ),
					data: cache[ src ]
				});
			},
			addEach = function( dst ) {
				return function( filepath ) {
					add( filepath, dst.concat( filepath ) );
				};
			},
			basedir = this.basedir,
			build = [],
			cssFull = this.cssFull,
			cssMin = this.cssMin,
			full = this.full,
			min = this.min,
			selectedRe = new RegExp( this.fields.join( "|" ) ),
			selected = function( filepath ) {
				return selectedRe.test( filepath );
			};

		commonFiles.forEach( addEach( [ "development-bundle" ] ) );
		componentFiles.filter( selected ).forEach( addEach( [ "development-bundle" ] ) );
		demoFiles.filter(function( filepath ) {
			var componentSubdir = filepath.split( "/" )[ 1 ];
			return selected( componentSubdir );
		}).forEach( addEach( [ "development-bundle" ] ));

		// Full
		[ "development-bundle/ui/jquery-ui-" + pkg.version + ".custom.js",
		  "js/jquery-ui-" + pkg.version + ".custom.js"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: full
			});
		});
		[ "development-bundle/themes/base/jquery-ui-" + pkg.version + ".custom.css",
		  "css/base/jquery-ui-" + pkg.version + ".custom.css"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: cssFull
			});
		});

		// Min
		[ "development-bundle/ui/minified/jquery-ui-" + pkg.version + ".custom.min.js",
		  "js/jquery-ui-" + pkg.version + ".custom.min.js"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: min
			});
		});
		[ "development-bundle/themes/base/minified/jquery-ui-" + pkg.version + ".custom.min.css",
		  "css/base/jquery-ui-" + pkg.version + ".custom.min.css"
		].forEach(function( dst ) {
			build.push({
				path: [ basedir, dst ].join( "/" ),
				data: cssMin
			});
		});

		// Ad hoc
		if ( this.fields.indexOf( "datepicker" ) >= 0 ) {
			[ "ui/i18n/jquery-ui-i18n.js", "ui/minified/i18n/jquery-ui-i18n.min.js" ].forEach( addEach( ["development-bundle"] ) );
		}
		imageFiles.forEach(function( filepath ) {
			add( filepath, [ filepath.replace( "themes", "css" ) ] );
		});
		add( jqueryFilename, [ "js", jqueryFilename ] );
		build.push({
			path: [ basedir, "index.html" ].join( "/" ),
			data: indexTemplate({
				jquery: jqueryFilename,
				ui: this.ui
			})
		});

		callback( build );
	},

	filename: function() {
		return this.basedir + ".zip";
	},

	writeTo: function( response, callback ) {
		var that = this,
			start = new Date();
		this.build(function( build ) {
			var zip = zipstream.createZip();
			zip.pipe( response );
			async.forEachSeries( build, function( file, next ) {
				zip.addFile( file.data, { name: file.path }, next );
			}, function() {
				zip.finalize(function( written ) {
					// Log statistics
					download_logger.info( JSON.stringify({
						components: that.fields,
						build_size: written,
						build_time: new Date() - start
					}) );
					callback( null, "All good!" );
				});
			});
		});
	}
};

module.exports = Builder;
