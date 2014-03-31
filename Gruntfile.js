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
		ThemeGallery = require( "./lib/themeroller.themegallery" );

	// For each jQuery UI release specified in the config file:
	async.forEachSeries( JqueryUi.all(), function( jqueryUi, callback ) {
		var builder = new Builder( jqueryUi, ":all:" ),
			themeGallery = new ThemeGallery( jqueryUi );

		async.series([

			// (a) Build jquery-ui-[VERSION].zip;
			function( callback ) {
				var stream,
					theme = themeGallery[ 0 ],
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
			// TODO: Review jQuery UI release script and avoid duplicate code.
			function( callback ) {
				var basedir, filename, output,
					add = function( file ) {
						output.push({
							path: path.join( basedir, file.path ),
							data: file.data
						});
					};

				async.series([

					// Include "AUTHORS.txt", "MIT-LICENSE.txt", "package.json".
					function( callback ) {
						builder.build(function( error, build ) {
							if ( error ) {
								return callback( error );
							}
							output = [];
							basedir = path.join( folder, "jquery-ui-themes-" + builder.jqueryUi.pkg.version );
							filename = basedir + ".zip";
							grunt.log.ok( "Building \"" + filename + "\"" );

							[ "AUTHORS.txt", "MIT-LICENSE.txt", "package.json" ].map(function( name ) {
								return build.get( name );
							}).forEach( add );
							return callback();
						});
					},

					// Include css/<theme>.
					function( callback ) {
						async.mapSeries( themeGallery, function( theme, callback ) {
							var themeCssOnlyRe, themeDirRe,
								folderName = theme.folderName(),
								packer = new Packer( builder, theme, {
									skipDocs: true
								});

							// TODO improve code by using custom packer instead of download packer (Packer)
							themeCssOnlyRe = new RegExp( "development-bundle/themes/" + folderName + "/theme.css" );
							themeDirRe = new RegExp( "css/" + folderName );
							packer.pack(function( error, files ) {
								if ( error ) {
									return callback( error );
								}

								// Add theme files.
								files

									// Pick only theme files we need on the bundle.
									.filter(function( file ) {
										if ( themeCssOnlyRe.test( file.path ) || themeDirRe.test( file.path ) ) {
											return true;
										}
										return false;
									})

									// Convert paths the way bundle needs
									.map(function( file ) {
										file.path = file.path

											// Remove initial package name eg. "jquery-ui-1.10.0.custom"
											.split( "/" ).slice( 1 ).join( "/" )

											.replace( /development-bundle\/themes/, "css" )
											.replace( /css/, "themes" )

											// Make jquery-ui-1.10.0.custom.css into jquery-ui.css, or jquery-ui-1.10.0.custom.min.css into jquery-ui.min.css
											.replace( /jquery-ui-.*?(\.min)*\.css/, "jquery-ui$1.css" );

										return file;
									}).forEach( add );

								return callback();
							});
						}, callback );
					},

					// Create and include MD5 manifest.
					function( callback ) {
						var crypto = require( "crypto" );
						add({
							path: "MANIFEST",
							data: output.sort(function( a, b ) {
								return a.path.localeCompare( b.path );
							}).map(function( file ) {
								var md5 = crypto.createHash( "md5" );
								md5.update( file.data );
								return file.path + " " + md5.digest( "hex" );
							}).join( "\n" )
						});
						return callback();
					}
				], function( error ) {
					if ( error ) {
						return callback( error );
					}
					if ( fs.existsSync( filename ) ) {
						grunt.log.warn( filename + "\" already exists. Skipping..." );
						return callback();
					}
					require( "./lib/util" ).createZip( output, filename, function( error ) {
						if ( error ) {
							return callback( error );
						}
						return callback();
					});
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

grunt.registerTask( "build-app", [ "handlebars", "uglify" ] );

grunt.registerTask( "build-packages", "Builds zip package of each jQuery UI release specified in config file with all components and lightness theme, inside the given folder", function( folder ) {
	var done = this.async();
  buildPackages( folder, function( err ) {
		// Make grunt to quit properly. Here, a proper error message should have been printed already.
		// 1: true on success, false on error
		done( !err /* 1 */ );
  });
});

grunt.registerTask( "mkdirs", "Create directories", function() {
	[ "app/resources/template", "log", "tmp" ].forEach(function( dir ) {
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
