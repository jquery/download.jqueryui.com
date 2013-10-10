var async = require( "async" ),
	fs = require( "fs" ),
	path = require( "path" );

module.exports = function( grunt ) {

"use strict";
grunt.loadNpmTasks( "grunt-check-modules" );
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
				"app/src/template/download.js": [ "template/download/components.html", "template/download/service_status.html", "template/download/theme.html" ],
				"app/src/template/themeroller.js": [ "template/themeroller/rollyourown.html", "template/themeroller/_rollyourown_group_corner.html", "template/themeroller/_rollyourown_group_default.html", "template/themeroller/_rollyourown_group_dropshadow.html", "template/themeroller/_rollyourown_group_font.html", "template/themeroller/_rollyourown_group_modaloverlay.html" ]
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
	uglify: {
		options: {
			preserveComments: "some"
		},
		// DownloadBuilder minified frontend bundle
		download: {
			src: [ "app/src/external/event_emitter.min.js", "app/src/external/handlebars.runtime.js", "app/src/template/download.js", "app/src/external/lzma.js", "app/src/hash.js", "app/src/querystring.js", "app/src/model.js", "app/src/download.js" ],
			dest: "app/resources/download.all.min.js"
		},
		// ThemeRoller minified frontend bundle
		themeroller: {
			src: [ "app/src/external/event_emitter.min.js", "app/src/external/handlebars.runtime.js", "app/src/template/themeroller.js", "app/src/external/farbtastic.js", "app/src/external/lzma.js", "app/src/hash.js", "app/src/querystring.js", "app/src/model.js", "app/src/themeroller.js" ],
			dest: "app/resources/themeroller.all.min.js"
		}
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
			grunt.util.spawn({
				cmd: "grunt",
				args: [ "manifest" ],
				opts: {
					cwd: "tmp/jquery-ui"
				}
			}, log( callback, "Done building manifest", "Error building manifest" ) );
		},
		function() {
			grunt.log.writeln( "Building API documentation for jQuery UI" );
			if ( !fs.existsSync( "tmp/api.jqueryui.com/config.json" ) ) {
				grunt.file.copy( "tmp/api.jqueryui.com/config-sample.json", "tmp/api.jqueryui.com/config.json" );
				grunt.log.writeln( "Copied config-sample.json to config.json" );
			}
			grunt.util.spawn({
				cmd: "grunt",
				args: [ "build-xml-entries" ],
				opts: {
					cwd: "tmp/api.jqueryui.com"
				}
			}, log( callback, "Done building documentation", "Error building documentation" ) );
		}
	]);
}

function copy( ref ) {
	return function( callback ) {
		var docs = "tmp/api.jqueryui.com/dist/wordpress/posts/post",
			rimraf = require( "rimraf" ),
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
				grunt.log.writeln( "Copying API documentation for jQuery UI over to jquery-ui/" + ref + "/docs/" );
				grunt.file.expand({ filter: "isFile" }, docs + "/**" ).forEach(function( file ) {
					grunt.file.copy( file, file.replace( docs, "jquery-ui/" + ref + "/docs/" ));
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
		ThemeRoller = require( "./lib/themeroller" );

	async.forEachSeries( JqueryUi.all(), function( jqueryUi, next ) {
		var stream,
			theme = new ThemeRoller({ version: jqueryUi.pkg.version }),
			build = new Builder( jqueryUi, ":all:" ),
			packer = new Packer( build, theme ),
			filename = path.join( folder, packer.filename() );
		grunt.log.ok( "Building \"" + filename + "\" with all components selected and base theme" );
		if ( fs.existsSync( filename ) ) {
			grunt.log.error( "Build: \"" + filename + "\" already exists" );
			return next( true );
		}
		stream = fs.createWriteStream( filename );
		packer.zipTo( stream, function( err, result ) {
			if ( err ) {
				grunt.log.error( "Build: " + err.message );
				return next( err );
			}
			stream.on( "close", function() {
				next();
			});
			stream.on( "error", function( err ) {
				grunt.log.error( err.message );
				next( err );
			});
			stream.end();
		});
	}, callback );
}

grunt.registerTask( "default", [ "check-modules", "jshint" ] );

grunt.registerTask( "build-app", [ "handlebars", "uglify" ] );

grunt.registerTask( "build-packages", "Builds zip package of each jQuery UI release specified in config file with all components and base theme, inside the given folder", function( folder ) {
	var done = this.async();
  buildPackages( folder, function( err ) {
		// Make grunt to quit properly. Here, a proper error message should have been printed already.
		// 1: true on success, false on error
		done( !err /* 1 */ );
  });
});

grunt.registerTask( "mkdirs", "Create directories", function() {
	if ( !fs.existsSync( "app/resources/template" ) ) {
		grunt.file.mkdir( "app/resources/template" );
	}
	if ( !fs.existsSync( "tmp" ) ) {
		grunt.file.mkdir( "tmp" );
	}
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
