"use strict";

var async = require( "async" ),
	fs = require( "node:fs" ),
	fsp = require( "node:fs/promises" ),
	path = require( "node:path" ),
	semver = require( "semver" );

module.exports = function( grunt ) {

grunt.loadNpmTasks( "grunt-check-modules" );
grunt.loadNpmTasks( "grunt-contrib-clean" );
grunt.loadNpmTasks( "grunt-contrib-copy" );
grunt.loadNpmTasks( "grunt-contrib-handlebars" );
grunt.loadNpmTasks( "grunt-contrib-uglify" );
grunt.loadNpmTasks( "grunt-eslint" );

grunt.initConfig( {
	pkg: grunt.file.readJSON( "package.json" ),
	handlebars: {
		options: {

			// Use basename as the key for the precompiled object.
			processName: function( filepath ) {
				return path.basename( filepath );
			},

			// Wrap preprocessed template functions in Handlebars.template function.
			wrapped: true
		},
		compile: {
			files: {
				"tmp/app/template/download.js": [ "template/download/components.html", "template/download/service_status.html", "template/download/theme.html" ],
				"tmp/app/template/themeroller.js": [ "template/themeroller/rollyourown.html", "template/themeroller/_rollyourown_group_corner.html", "template/themeroller/_rollyourown_group_default.html", "template/themeroller/_rollyourown_group_dropshadow.html", "template/themeroller/_rollyourown_group_font.html", "template/themeroller/_rollyourown_group_modaloverlay.html" ]
			}
		}
	},
	eslint: {
		all: [ "*.js", "test/*js", "lib/**/*.js", "app/src/*.js" ]
	},
	copy: {
		appExternalFarbtastic: {
			src: "external/farbtastic/farbtastic.css",
			dest: "app/dist/external/farbtastic.css"
		},
		appImages: {
			expand: true,
			cwd: "app/src",
			src: [ "images/**/*" ],
			dest: "app/dist"
		},
		appImagesExternalFarbtastic: {
			expand: true,
			cwd: "external/farbtastic",
			src: [ "marker.png", "mask.png", "wheel.png" ],
			dest: "app/dist/images/farbtastic"
		},
		appStyles: {
			expand: true,
			cwd: "app/src",
			src: [ "download.css", "themeroller.css" ],
			dest: "app/dist"
		}
	},
	uglify: {
		options: {
			preserveComments: "some"
		},

		// DownloadBuilder minified frontend bundle
		download: {
			src: [ "node_modules/wolfy87-eventemitter/EventEmitter.js", "node_modules/handlebars/dist/handlebars.runtime.js", "tmp/app/template/download.js", "node_modules/lzma/src/lzma.js", "app/src/hash.js", "app/src/querystring.js", "app/src/model.js", "app/src/download.js" ],
			dest: "app/dist/download.all.min.js"
		},

		// ThemeRoller minified frontend bundle
		themeroller: {
			src: [ "node_modules/wolfy87-eventemitter/EventEmitter.js", "node_modules/handlebars/dist/handlebars.runtime.js", "tmp/app/template/themeroller.js", "external/farbtastic/farbtastic.js", "node_modules/lzma/src/lzma.js", "app/src/hash.js", "app/src/querystring.js", "app/src/model.js", "app/src/themeroller.js" ],
			dest: "app/dist/themeroller.all.min.js"
		},
		external_lzma_worker: {
			src: [ "node_modules/lzma/src/lzma_worker.js" ],
			dest: "app/dist/external/lzma_worker.min.js"
		}
	},
	clean: {
		appDist: [ "app/dist" ]
	}
} );

function log( callback, successMsg, errorMsg ) {
	return function( error, result, code ) {
		if ( error && errorMsg ) {
			grunt.log.error( errorMsg );
			grunt.log.error( error );
			grunt.log.error( result.stdout );
			grunt.log.error( result.stderr );
		} else if ( !error && successMsg ) {
			grunt.log.ok( successMsg );
		}
		callback( error, result, code );
	};
}

function cloneOrFetch( callback ) {
	if ( fs.existsSync( "tmp/jquery-ui" ) ) {
		grunt.log.writeln( "Fetch updates for jquery-ui repo" );
		async.series( [

			// Fetch branch heads (even if not referenced by tags), see c08cf67.
			function( callback ) {
				grunt.util.spawn( {
					cmd: "git",
					args: [ "fetch" ],
					opts: {
						cwd: "tmp/jquery-ui"
					}
				}, callback );
			},

			// Fetch tags not referenced by heads. Yes, we need both.
			function( callback ) {
				grunt.util.spawn( {
					cmd: "git",
					args: [ "fetch", "-t" ],
					opts: {
						cwd: "tmp/jquery-ui"
					}
				}, callback );
			}
		], log( callback, "Fetched repo", "Error fetching repo" ) );
	} else {
		grunt.log.writeln( "Cloning jquery-ui repo" );
		grunt.util.spawn( {
			cmd: "git",
			args: [ "clone", "https://github.com/jquery/jquery-ui.git", "jquery-ui" ],
			opts: {
				cwd: "tmp"
			}
		}, log( callback, "Cloned repo", "Error cloning repo" ) );
	}
}

function checkout( jqueryUi ) {
	var ref = jqueryUi.ref;
	return function( callback ) {
		grunt.log.writeln( "Checking out jquery-ui branch/tag: " + ref );
		grunt.util.spawn( {
			cmd: "git",
			args: [ "checkout", "-f", ref ],
			opts: {
				cwd: "tmp/jquery-ui"
			}
		}, log( callback, "Done with checkout", "Error checking out" ) );
	};
}

function copy( jqueryUi ) {
	var ref = jqueryUi.ref;
	return function( callback ) {
		var version = grunt.file.readJSON( "tmp/jquery-ui/package.json" ).version;
		grunt.file.mkdir( "jquery-ui" );
		async.series( [
			function( next ) {
				if ( fs.existsSync( "jquery-ui/" + ref ) ) {
					grunt.log.writeln( "Cleaning up existing jquery-ui/" + ref );
					const rmCallback = log( next, "Cleaned", "Error cleaning" );
					fsp.rm( `jquery-ui/${ ref }`, { recursive: true, force: true } )
						.then( () => {
							rmCallback( null, "OK", 0 );
						} )
						.catch( error => {
							rmCallback( error, null, 1 );
						} );
				} else {
					next();
				}
			},
			function() {
				var from = "tmp/jquery-ui",
					to = "jquery-ui/" + ref;
				grunt.log.writeln( "Copying jQuery UI " + version + " over to jquery-ui/" + ref );
				try {
					grunt.file.recurse( from, function( filepath ) {

						// Skip files from the `.git` directory; we don't need them,
						// there may be a lot of them and them may include IPC files
						// that cannot be copied.
						if ( filepath.indexOf( "/.git/" ) === -1 ) {
							grunt.file.copy( filepath, filepath.replace( new RegExp( "^" + from ), to ) );
						}
					} );
				} catch ( e ) {
					grunt.log.error( "Error copying", e.toString() );
					return callback( e );
				}
				grunt.log.ok( "Done copying" );
				callback();
			}
		] );
	};
}

function prepareAll( callback ) {
	var config = require( "./lib/config" )();

	async.forEachSeries( config.jqueryUi, function( jqueryUi, callback ) {
		async.series( [
			checkout( jqueryUi ),
			copy( jqueryUi )
		], function( err ) {

			// Go to next ref
			callback( err );
		} );
	}, function( err ) {

		// Done
		callback( err );
	} );
}

function packagerZip( packageModule, zipBasedir, themeVars, folder, jqueryUi, callback ) {
	var Package = require( packageModule );
	var Packager = require( "node-packager" );
	var filename = path.join( folder, zipBasedir + ".zip" );
	grunt.log.ok( "Building \"" + filename + "\"" );
	if ( fs.existsSync( filename ) ) {
		grunt.log.warn( filename + "\" already exists. Skipping..." );
		return callback();
	}
	var target = fs.createWriteStream( filename );
	var packager = new Packager( jqueryUi.files().cache, Package, {
		components: jqueryUi.components().map( function( component ) {
			return component.name;
		} ),
		jqueryUi: jqueryUi,
		themeVars: themeVars
	} );
	packager.ready.then( function() {
		packager.toZip( target, {
			basedir: zipBasedir
		}, function( error ) {
			if ( error ) {
				return callback( error );
			}
			callback();
		} );
	} );
}

function buildPackages( folder, callback ) {
	var JqueryUi = require( "./lib/jquery-ui" ),
		ThemeGallery = require( "./lib/themeroller-themegallery" );

	// For each jQuery UI release specified in the config file:
	async.forEachSeries( JqueryUi.all(), function( jqueryUi, callback ) {
		async.series( [

			// (a) Build jquery-ui-[VERSION].zip;
			function( callback ) {
				if ( semver.gte( jqueryUi.pkg.version, "1.13.0-a" ) ) {
					packagerZip( "./lib/package-1-13", "jquery-ui-" + jqueryUi.pkg.version,
						new ThemeGallery( jqueryUi )[ 0 ].vars, folder, jqueryUi, callback );
				} else {
					packagerZip( "./lib/package-1-12", "jquery-ui-" + jqueryUi.pkg.version,
						new ThemeGallery( jqueryUi )[ 0 ].vars, folder, jqueryUi, callback );
				}
			},

			// (b) Build themes package jquery-ui-themes-[VERSION].zip;
			function( callback ) {
				if ( semver.gte( jqueryUi.pkg.version, "1.13.0-a" ) ) {
					packagerZip( "./lib/package-1-13-themes", "jquery-ui-themes-" + jqueryUi.pkg.version,
						null, folder, jqueryUi, callback );
				} else {
					packagerZip( "./lib/package-1-12-themes", "jquery-ui-themes-" + jqueryUi.pkg.version,
						null, folder, jqueryUi, callback );
				}
			}

		], function( error ) {
			if ( error ) {
				grunt.log.error( error.message );
			}
			return callback();
		} );
	}, callback );
}

grunt.registerTask( "default", [ "check-modules", "eslint", "test" ] );

grunt.registerTask( "build-app", [ "clean", "handlebars", "copy", "uglify" ] );

grunt.registerTask( "build-packages", "Builds zip package of each jQuery UI release specified in config file with all components and lightness theme, inside the given folder", function( folder ) {
	var done = this.async();
	buildPackages( folder, function( err ) {

		// Make grunt to quit properly. Here, a proper error message should have been printed already.
		// 1: true on success, false on error
		done( !err /* 1 */ );
  } );
} );

grunt.registerTask( "mkdirs", "Create directories", function() {
	[ "log", "tmp" ].forEach( function( dir ) {
		if ( !fs.existsSync( dir ) ) {
			grunt.file.mkdir( dir );
		}
	} );
} );

grunt.registerTask( "prepare", [
	"check-modules",
	"eslint",
	"mkdirs",
	"prepare-jquery-ui",
	"build-app"
] );

grunt.registerTask( "prepare-jquery-ui", "Fetches and builds jQuery UI releases specified in config file", function() {
	var done = this.async();
	async.series( [
		cloneOrFetch,
		prepareAll
	], function( err ) {

		// Make grunt to quit properly. Here, a proper error message should have been printed already.
		// 1: true on success, false on error
		done( !err /* 1 */ );
	} );
} );

grunt.registerTask( "test", "Runs npm test", function() {
	var done = this.async();
	grunt.util.spawn( {
		cmd: "npm",
		args: [ "test" ]
	}, done );
} );

};
