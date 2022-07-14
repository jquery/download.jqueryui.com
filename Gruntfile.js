"use strict";

var async = require( "async" ),
	fs = require( "fs" ),
	path = require( "path" ),
	rimraf = require( "rimraf" ),
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
	async.series( [
		function( callback ) {
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
		},
		function() {
			if ( fs.existsSync( "tmp/api.jqueryui.com" ) ) {
				grunt.log.writeln( "Fetch updates for api.jqueryui.com repo" );
				grunt.util.spawn( {
					cmd: "git",
					args: [ "fetch" ],
					opts: {
						cwd: "tmp/api.jqueryui.com"
					}
				}, log( callback, "Fetched repo", "Error fetching repo" ) );
			} else {
				grunt.log.writeln( "Cloning api.jqueryui.com repo" );
				grunt.util.spawn( {
					cmd: "git",
					args: [
						"clone",
						"https://github.com/jquery/api.jqueryui.com.git",
						"api.jqueryui.com"
					],
					opts: {
						cwd: "tmp"
					}
				}, log( callback, "Cloned repo", "Error cloning repo" ) );
			}
		}
	] );
}

function checkout( jqueryUi ) {
	var ref = jqueryUi.ref;
	return function( callback ) {
		async.series( [

			// Check out jquery-ui
			function( next ) {
				grunt.log.writeln( "Checking out jquery-ui branch/tag: " + ref );
				grunt.util.spawn( {
					cmd: "git",
					args: [ "checkout", "-f", ref ],
					opts: {
						cwd: "tmp/jquery-ui"
					}
				}, log( jqueryUi.docs ? next : callback, "Done with checkout", "Error checking out" ) );
			},

			// Check out api.jqueryui.com
			function() {
				var docRef = "origin/master";
				async.series( [

					// Get the correct documentation for jquery-ui version
					function( callback ) {

						// If ref is a branch, then get documentation "master" branch.
						if ( !( /^\d+.\d+/ ).test( ref ) ) {
							return callback();
						}

						// If ref is a tag, then get its corresponding <major>-<minor> branch, if available or "master".
						grunt.util.spawn( {
							cmd: "git",
							args: [ "branch", "-a" ],
							opts: {
								cwd: "tmp/api.jqueryui.com"
							}
						}, function( error, docBranches ) {
							docBranches = String( docBranches );
							if ( error ) {
								grunt.log.error( "Error listing branches: " + error.stderr );
							} else {
								var correspondingBranch = ref.replace( /^(\d+).(\d+).*/, "$1-$2" ),
									isCorrespondingBranch = function( branch ) {
										return ( new RegExp( "origin/" + correspondingBranch + "$" ) ).test( branch );
									};
								if ( docBranches.split( "\n" ).some( isCorrespondingBranch ) ) {
									docRef = correspondingBranch;
								} else {
									grunt.log.writeln( "Did not find a \"" + correspondingBranch + "\" branch, using \"master\"" );
								}
								callback();
							}
						} );
					},
					function() {
						grunt.log.writeln( "Checking out api.jqueryui.com branch/tag: " + docRef );
						grunt.util.spawn( {
							cmd: "git",
							args: [ "checkout", "-f", docRef ],
							opts: {
								cwd: "tmp/api.jqueryui.com"
							}
						}, log( callback, "Done with checkout", "Error checking out" ) );
					}
				] );
			}
		] );
	};
}

function install( jqueryUi ) {
	return function( callback ) {
		async.series( [
			function( next ) {
				if ( !jqueryUi.docs ) {
					return next();
				}
				grunt.log.writeln( "Installing api.jqueryui.com npm modules" );
				grunt.util.spawn( {
					cmd: "npm",
					args: [ "prune" ],
					opts: {
						cwd: "tmp/api.jqueryui.com"
					}
				}, log( next, null, "Error pruning npm modules" ) );
			},
			function() {
				if ( !jqueryUi.docs ) {
					return callback();
				}
				grunt.util.spawn( {
					cmd: "npm",
					args: [ "install" ],
					opts: {
						cwd: "tmp/api.jqueryui.com"
					}
				}, log( callback, "Installed npm modules", "Error installing npm modules" ) );
			}
		] );
	};
}

function prepare( jqueryUi ) {
	return function( callback ) {
		async.series( [
			function() {
				if ( !jqueryUi.docs ) {
					return callback();
				}
				grunt.log.writeln( "Building API documentation for jQuery UI" );
				if ( !fs.existsSync( "tmp/api.jqueryui.com/config.json" ) ) {
					grunt.file.copy( "tmp/api.jqueryui.com/config-sample.json", "tmp/api.jqueryui.com/config.json" );
					grunt.log.writeln( "Copied config-sample.json to config.json" );
				}
				rimraf.sync( "tmp/api.jqueryui.com/dist" );
				grunt.util.spawn( {
					cmd: "node_modules/.bin/grunt",
					args: [ "build", "--stack" ],
					opts: {
						cwd: "tmp/api.jqueryui.com"
					}
				}, log( callback, "Done building documentation", "Error building documentation" ) );
			}
		] );
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
					rimraf( "jquery-ui/" + ref, log( next, "Cleaned", "Error cleaning" ) );
				} else {
					next();
				}
			},
			function( next ) {
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
					return ( jqueryUi.docs ? next : callback )( e );
				}
				grunt.log.ok( "Done copying" );
				( jqueryUi.docs ? next : callback )();
			},
			function( callback ) {
				var srcpath = "tmp/api.jqueryui.com/dist/wordpress",
					destpath = "jquery-ui/" + ref + "/docs/";
				grunt.log.writeln( "Copying API documentation for jQuery UI over to " + destpath );
				[ srcpath + "/posts/post", srcpath + "/posts/page" ].forEach( function( srcpath ) {
					grunt.file.expand( { filter: "isFile" }, srcpath + "/**" ).forEach( function( file ) {

						// OBS: No overwrite check is needed, because the posts/pages basenames must be unique among themselves.
						grunt.file.copy( file, file.replace( srcpath, destpath ) );
					} );
				} );
				callback();
			},
			function() {
				var removePath = ref + "/node_modules";
				grunt.log.writeln( "Cleaning up copied jQuery UI" );
				rimraf( "jquery-ui/" + removePath, log( callback, "Removed jquery-ui/" + removePath, "Error removing jquery-ui/" + removePath ) );
			}
		] );
	};
}

function prepareAll( callback ) {
	var config = require( "./lib/config" )();

	async.forEachSeries( config.jqueryUi, function( jqueryUi, callback ) {
		async.series( [
			checkout( jqueryUi ),
			install( jqueryUi ),
			prepare( jqueryUi ),
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
	var Builder = require( "./lib/builder" ),
		fs = require( "fs" ),
		path = require( "path" ),
		JqueryUi = require( "./lib/jquery-ui" ),
		Packer = require( "./lib/packer" ),
		ThemeGallery = require( "./lib/themeroller-themegallery" ),
		ThemesPacker = require( "./lib/themes-packer" );

	// For each jQuery UI release specified in the config file:
	async.forEachSeries( JqueryUi.all(), function( jqueryUi, callback ) {
		var builder = new Builder( jqueryUi, ":all:" );

		async.series( [

			// (a) Build jquery-ui-[VERSION].zip;
			function( callback ) {
				if ( semver.gte( jqueryUi.pkg.version, "1.13.0-a" ) ) {
					packagerZip( "./lib/package-1-13", "jquery-ui-" + jqueryUi.pkg.version,
						new ThemeGallery( jqueryUi )[ 0 ].vars, folder, jqueryUi, callback );
					return;
				}
				if ( semver.gte( jqueryUi.pkg.version, "1.12.0-a" ) ) {
					packagerZip( "./lib/package-1-12", "jquery-ui-" + jqueryUi.pkg.version,
						new ThemeGallery( jqueryUi )[ 0 ].vars, folder, jqueryUi, callback );
					return;
				}
				var stream,
					theme = new ThemeGallery( jqueryUi )[ 0 ],
					packer = new Packer( builder, theme, { bundleSuffix: "" } ),
					filename = path.join( folder, packer.filename() );
				grunt.log.ok( "Building \"" + filename + "\"" );
				if ( fs.existsSync( filename ) ) {
					grunt.log.warn( filename + "\" already exists. Skipping..." );
					return callback();
				}
				stream = fs.createWriteStream( filename );
				packer.zipTo( stream, function( error ) {
					if ( error ) {
						return callback( error );
					}
					return callback();
				} );
			},

			// (b) Build themes package jquery-ui-themes-[VERSION].zip;
			function( callback ) {
				if ( semver.gte( jqueryUi.pkg.version, "1.13.0-a" ) ) {
					packagerZip( "./lib/package-1-13-themes", "jquery-ui-themes-" + jqueryUi.pkg.version,
						null, folder, jqueryUi, callback );
					return;
				}
				if ( semver.gte( jqueryUi.pkg.version, "1.12.0-a" ) ) {
					packagerZip( "./lib/package-1-12-themes", "jquery-ui-themes-" + jqueryUi.pkg.version,
						null, folder, jqueryUi, callback );
					return;
				}
				var stream,
					packer = new ThemesPacker( builder ),
					filename = path.join( folder, packer.filename() );
				grunt.log.ok( "Building \"" + filename + "\"" );
				if ( fs.existsSync( filename ) ) {
					grunt.log.warn( filename + "\" already exists. Skipping..." );
					return callback();
				}
				stream = fs.createWriteStream( filename );
				packer.zipTo( stream, function( error, result ) {
					if ( error ) {
						return callback( error );
					}
					return callback();
				} );
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
