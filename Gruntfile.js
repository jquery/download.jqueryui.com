var async = require( "async" ),
	fs = require( "fs" ),
	path = require( "path" );

module.exports = function( grunt ) {

"use strict";
grunt.loadNpmTasks( "grunt-check-modules" );
grunt.loadNpmTasks( "grunt-contrib-clean" );
grunt.loadNpmTasks( "grunt-contrib-copy" );
grunt.loadNpmTasks( "grunt-contrib-handlebars" );
grunt.loadNpmTasks( "grunt-contrib-jshint" );
grunt.loadNpmTasks( "grunt-contrib-uglify" );

grunt.initConfig({
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
	jshint: {
		all: [ "*.js", "test/*js", "lib/**/*.js", "app/src/*.js" ],
		options: {
			boss: true,
			curly: true,
			eqeqeq: true,
			eqnull: true,
			immed: true,
			latedef: true,
			noarg: true,
			node: true,
			onevar: true,
			proto: true,
			smarttabs: true,
			strict: false,
			sub: true,
			trailing: true,
			undef: true
		}
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
			src: [ "external/eventEmitter/EventEmitter.js", "external/handlebars/handlebars.runtime.js", "tmp/app/template/download.js", "external/lzma-js/src/lzma.js", "app/src/hash.js", "app/src/querystring.js", "app/src/model.js", "app/src/download.js" ],
			dest: "app/dist/download.all.min.js"
		},
		// ThemeRoller minified frontend bundle
		themeroller: {
			src: [ "external/eventEmitter/EventEmitter.js", "external/handlebars/handlebars.runtime.js", "tmp/app/template/themeroller.js", "external/farbtastic/farbtastic.js", "external/lzma-js/src/lzma.js", "app/src/hash.js", "app/src/querystring.js", "app/src/model.js", "app/src/themeroller.js" ],
			dest: "app/dist/themeroller.all.min.js"
		},
		external_lzma_worker: {
			src: [ "external/lzma-js/src/lzma_worker.js" ],
			dest: "app/dist/external/lzma_worker.min.js"
		}
	},
	clean: {
		appDist: [ "app/dist" ]
	}
});

function log( callback, successMsg, errorMsg ) {
	return function( error, result, code ) {
		if ( error && errorMsg ) {
			grunt.log.error( errorMsg + ": " + error.stderr );
		} else if ( ! error && successMsg ) {
			grunt.log.ok( successMsg );
		}
		callback( error, result, code );
	};
}

function cloneOrFetch( callback ) {
	async.series([
		function( callback ) {
			if ( fs.existsSync( "tmp/jquery-ui" ) ) {
				grunt.log.writeln( "Fetch updates for jquery-ui repo" );
				async.series([

					// Fetch branch heads (even if not referenced by tags), see c08cf67.
					function( callback ) {
						grunt.util.spawn({
							cmd: "git",
							args: [ "fetch" ],
							opts: {
								cwd: "tmp/jquery-ui"
							}
						}, callback );
					},

					// Fetch tags not referenced by heads. Yes, we need both.
					function( callback ) {
						grunt.util.spawn({
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
				grunt.util.spawn({
					cmd: "git",
					args: [ "clone", "git://github.com/jquery/jquery-ui.git", "jquery-ui" ],
					opts: {
						cwd: "tmp"
					}
				}, log( callback, "Cloned repo", "Error cloning repo" ) );
			}
		},
		function() {
			if ( fs.existsSync( "tmp/api.jqueryui.com" ) ) {
				grunt.log.writeln( "Fetch updates for api.jqueryui.com repo" );
				grunt.util.spawn({
					cmd: "git",
					args: [ "fetch" ],
					opts: {
						cwd: "tmp/api.jqueryui.com"
					}
				}, log( callback, "Fetched repo", "Error fetching repo" ) );
			} else {
				grunt.log.writeln( "Cloning api.jqueryui.com repo" );
				grunt.util.spawn({
					cmd: "git",
					args: [ "clone", "git://github.com/jquery/api.jqueryui.com.git", "api.jqueryui.com" ],
					opts: {
						cwd: "tmp"
					}
				}, log( callback, "Cloned repo", "Error cloning repo" ) );
			}
		}
	]);
}

function prepareAll( callback ) {
	var config = require( "./lib/config" )();

	async.forEachSeries( config.jqueryUi, function( jqueryUi, callback ) {
		async.series([
			checkout( jqueryUi.ref ),
			install,
			prepare,
			copy( jqueryUi.ref )
		], function( err ) {
			// Go to next ref
			callback( err );
		});
	}, function( err ) {
		// Done
		callback( err );
	});
}

function checkout( ref ) {
	return function( callback ) {
		async.series([
			// Check out jquery-ui
			function( callback ) {
				grunt.log.writeln( "Checking out jquery-ui branch/tag: " + ref );
				grunt.util.spawn({
					cmd: "git",
					args: [ "checkout", "-f", ref ],
					opts: {
						cwd: "tmp/jquery-ui"
					}
				}, log( callback, "Done with checkout", "Error checking out" ) );
			},
			// Check out api.jqueryui.com
			function() {
				var docRef = "origin/master";
				async.series([
					// Get the correct documentation for jquery-ui version
					function( callback ) {
						// If ref is a branch, then get documentation "master" branch.
						if ( !(/^\d+.\d+/).test( ref ) ) {
							return callback();
						}
						// If ref is a tag, then get its corresponding <major>-<minor> branch, if available or "master".
						grunt.util.spawn({
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
						});
					},
					function() {
						grunt.log.writeln( "Checking out api.jqueryui.com branch/tag: " + docRef );
						grunt.util.spawn({
							cmd: "git",
							args: [ "checkout", "-f", docRef ],
							opts: {
								cwd: "tmp/api.jqueryui.com"
							}
						}, log( callback, "Done with checkout", "Error checking out" ) );
					}
				]);
			}
		]);
	};
}

function install( callback ) {
	async.series([
		function( callback ) {
			grunt.log.writeln( "Installing jquery-ui npm modules" );
			grunt.util.spawn({
				cmd: "npm",
				args: [ "prune" ],
				opts: {
					cwd: "tmp/jquery-ui"
				}
			}, log( callback, null, "Error pruning npm modules" ) );
		},
		function( callback ) {
			grunt.util.spawn({
				cmd: "npm",
				args: [ "install" ],
				opts: {
					cwd: "tmp/jquery-ui"
				}
			}, log( callback, "Installed npm modules", "Error installing npm modules" ) );
		},
		function( callback ) {
			grunt.log.writeln( "Installing api.jqueryui.com npm modules" );
			grunt.util.spawn({
				cmd: "npm",
				args: [ "prune" ],
				opts: {
					cwd: "tmp/api.jqueryui.com"
				}
			}, log( callback, null, "Error pruning npm modules" ) );
		},
		function() {
			grunt.util.spawn({
				cmd: "npm",
				args: [ "install" ],
				opts: {
					cwd: "tmp/api.jqueryui.com"
				}
			}, log( callback, "Installed npm modules", "Error installing npm modules" ) );
		}
	]);
}

function prepare( callback ) {
	async.series([
		function( callback ) {
			grunt.log.writeln( "Building manifest for jQuery UI" );
			grunt.file.expand( "tmp/jquery-ui/*.jquery.json" ).forEach(function( file ) {
				grunt.file.delete( file );
			});
			callback();
		},
		function( callback ) {
			grunt.util.spawn({
				cmd: "grunt",
				args: [ "manifest" ],
				opts: {
					cwd: "tmp/jquery-ui"
				}
			}, log( callback, "Done building manifest", "Error building manifest" ) );
		},
		function( callback ) {
			grunt.log.writeln( "Building API documentation for jQuery UI" );
			if ( !fs.existsSync( "tmp/api.jqueryui.com/config.json" ) ) {
				grunt.file.copy( "tmp/api.jqueryui.com/config-sample.json", "tmp/api.jqueryui.com/config.json" );
				grunt.log.writeln( "Copied config-sample.json to config.json" );
			}
			grunt.util.spawn({
				cmd: "grunt",
				args: [ "clean", "build" ],
				opts: {
					cwd: "tmp/api.jqueryui.com"
				}
			}, log( callback, "Done building documentation", "Error building documentation" ) );
		},
		function() {
			grunt.log.writeln( "Building manifest for API documentation for jQuery UI" );
			grunt.util.spawn({
				cmd: "grunt",
				args: [ "manifest" ],
				opts: {
					cwd: "tmp/api.jqueryui.com"
				}
			}, log( callback, "Done building manifest", "Error building manifest" ) );
		}
	]);
}

function copy( ref ) {
	return function( callback ) {
		var rimraf = require( "rimraf" ),
			version = grunt.file.readJSON( "tmp/jquery-ui/package.json" ).version,
			dir = require( "path" ).basename( "tmp/jquery-ui/dist/jquery-ui-" + version );
		grunt.file.mkdir( "jquery-ui" );
		async.series([
			function( callback ) {
				if ( fs.existsSync( "jquery-ui/" + ref ) ) {
					grunt.log.writeln( "Cleaning up existing jquery-ui/" + ref );
					rimraf( "jquery-ui/" + ref, log( callback, "Cleaned", "Error cleaning" ) );
				} else {
					callback();
				}
			},
			function( callback ) {
				var from = "tmp/jquery-ui",
					to = "jquery-ui/" + ref;
				grunt.log.writeln( "Copying jQuery UI " + version + " over to jquery-ui/" + ref );
				try {
					grunt.file.recurse( from, function( filepath ) {
							grunt.file.copy( filepath, filepath.replace( new RegExp( "^" + from ), to ) );
					});
				} catch( e ) {
					grunt.log.error( "Error copying", e.toString() );
					return callback( e );
				}
				grunt.log.ok( "Done copying" );
				callback();
			},
			function( callback ) {
				var srcpath = "tmp/api.jqueryui.com/dist/wordpress",
					destpath = "jquery-ui/" + ref + "/docs/";
				grunt.log.writeln( "Copying API documentation for jQuery UI over to " + destpath );
				grunt.file.copy( srcpath + "/categories.json", destpath + "/categories.json" );
				[ srcpath + "/posts/post", srcpath + "/posts/page" ].forEach(function( srcpath ) {
					grunt.file.expand({ filter: "isFile" }, srcpath + "/**" ).forEach(function( file ) {
						// OBS: No overwrite check is needed, because the posts/pages basenames must be unique among themselves.
						grunt.file.copy( file, file.replace( srcpath, destpath ));
					});
				});
				callback();
			},
			function() {
				var removePath = ref + "/node_modules";
				grunt.log.writeln( "Cleaning up copied jQuery UI" );
				rimraf( "jquery-ui/" + removePath, log( callback, "Removed jquery-ui/" + removePath, "Error removing jquery-ui/" + removePath ) );
			}
		]);
	};
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

		async.series([

			// (a) Build jquery-ui-[VERSION].zip;
			function( callback ) {
				var stream,
					theme = new ThemeGallery( jqueryUi )[ 0 ],
					packer = new Packer( builder, theme, { bundleSuffix: "" }),
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
				});
			},

			// (b) Build themes package jquery-ui-themes-[VERSION].zip;
			function( callback ) {
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
				});
			}

		], function( error ) {
			if ( error ) {
				grunt.log.error( error.message );
			}
			return callback();
		});
	}, callback );
}

grunt.registerTask( "default", [ "check-modules", "jshint" ] );

grunt.registerTask( "build-app", [ "clean:appDist", "handlebars", "copy", "uglify" ] );

grunt.registerTask( "build-packages", "Builds zip package of each jQuery UI release specified in config file with all components and lightness theme, inside the given folder", function( folder ) {
	var done = this.async();
  buildPackages( folder, function( err ) {
		// Make grunt to quit properly. Here, a proper error message should have been printed already.
		// 1: true on success, false on error
		done( !err /* 1 */ );
  });
});

grunt.registerTask( "mkdirs", "Create directories", function() {
	[ "log", "tmp" ].forEach(function( dir ) {
		if ( !fs.existsSync( dir ) ) {
			grunt.file.mkdir( dir );
		}
	});
});

grunt.registerTask( "prepare", [ "check-modules", "mkdirs", "prepare-jquery-ui", "build-app" ] );

grunt.registerTask( "prepare-jquery-ui", "Fetches and builds jQuery UI releases specified in config file", function() {
	var done = this.async();
	async.series([
		cloneOrFetch,
		prepareAll
	], function( err ) {
		// Make grunt to quit properly. Here, a proper error message should have been printed already.
		// 1: true on success, false on error
		done( !err /* 1 */ );
	});
});

};
