var async = require( "async" );
var fs = require( "fs" );

module.exports = function( grunt ) {

"use strict";

grunt.initConfig({
	pkg: "<json:package.json>",
	lint: {
		files: [ "*.js", "lib/**/*.js", "app/resources/*.js" ]
	},
	jshint: {
		options: {
			curly: true,
			eqeqeq: true,
			immed: true,
			latedef: true,
			newcap: true,
			noarg: true,
			sub: true,
			undef: true,
			boss: true,
			eqnull: true,
			node: true,
			smarttabs: true,
			trailing: true,
			onevar: true
		}
	}
});

grunt.registerTask( "default", "lint" );

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

function setup( callback ) {
	if ( !fs.existsSync( "tmp" ) ) {
		grunt.file.mkdir( "tmp" );
	}
	callback();
}

function cloneOrFetch( callback ) {
	async.series([
		function( callback ) {
			if ( fs.existsSync( "tmp/jquery-ui" ) ) {
				grunt.log.writeln( "Fetch updates for jquery-ui repo" );
				grunt.utils.spawn({
					cmd: "git",
					args: [ "fetch", "-t" ],
					opts: {
						cwd: "tmp/jquery-ui"
					}
				}, log( callback, "Fetched repo", "Error fetching repo" ) );
			} else {
				grunt.log.writeln( "Cloning jquery-ui repo" );
				grunt.utils.spawn({
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
				grunt.utils.spawn({
					cmd: "git",
					// TODO add , "-t" when we switch from master to tags
					args: [ "fetch" ],
					opts: {
						cwd: "tmp/api.jqueryui.com"
					}
				}, log( callback, "Fetched repo", "Error fetching repo" ) );
			} else {
				grunt.log.writeln( "Cloning api.jqueryui.com repo" );
				grunt.utils.spawn({
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

function buildAll( callback ) {
	var refs = grunt.file.readJSON( "config.json" ).jqueryUi;

	if ( typeof refs === "string" ) {
		refs = [ refs ];
	}
	if ( !Array.isArray( refs ) ) {
		grunt.log.error( "Missing jqueryUi branch/tag in config.json" )
		callback( true );
	}

	async.forEachSeries( refs, function( ref, callback ) {
		async.series([
			checkout( ref ),
			install,
			build,
			copy( ref )
		], function( err ) {
			callback( err );//go to next ref
		});
	}, function( err ) {
		callback( err );//done
	});
}

function checkout( ref ) {
	return function( callback ) {
		async.series([
			function( callback ) {
				grunt.log.writeln( "Checking out jquery-ui branch/tag: " + ref );
				grunt.utils.spawn({
					cmd: "git",
					args: [ "checkout", "-f", ref ],
					opts: {
						cwd: "tmp/jquery-ui"
					}
				}, log( callback, "Done with checkout", "Error checking out" ) );
			},
			// TODO: Figure out how to get correct docs for version. We will
			// eventually support multiple version and will need to pull in the
			// docs from the appropriate branch.
			// See also TODO above for git-fetch
			function() {
				grunt.log.writeln( "Checking out api.jqueryui.com/master" );
				grunt.utils.spawn({
					cmd: "git",
					args: [ "checkout", "-f", "origin/master" ],
					opts: {
						cwd: "tmp/api.jqueryui.com"
					}
				}, log( callback, "Done with checkout", "Error checking out" ) );
			}
		]);
	};
}

// TODO: Is there a way to clean up the install/update duplication?
function install( callback ) {
	async.series([
		function( callback ) {
			grunt.log.writeln( "Installing jquery-ui npm modules" );
			grunt.utils.spawn({
				cmd: "npm",
				args: [ "install" ],
				opts: {
					cwd: "tmp/jquery-ui"
				}
			}, log( callback, "Installed npm modules", "Error installing npm modules" ) );
		},
		function( callback ) {
			grunt.utils.spawn({
				cmd: "npm",
				args: [ "update" ],
				opts: {
					cwd: "tmp/jquery-ui"
				}
			}, log( callback, "Updated npm modules", "Error updating npm modules" ) );
		},
		function( callback ) {
			grunt.log.writeln( "Installing api.jqueryui.com npm modules" );
			grunt.utils.spawn({
				cmd: "npm",
				args: [ "install" ],
				opts: {
					cwd: "tmp/api.jqueryui.com"
				}
			}, log( callback, "Installed npm modules", "Error installing npm modules" ) );
		},
		function() {
			grunt.utils.spawn({
				cmd: "npm",
				args: [ "update" ],
				opts: {
					cwd: "tmp/api.jqueryui.com"
				}
			}, log( callback, "Updated npm modules", "Error updating npm modules" ) );
		}
	]);
}

function build( callback ) {
	async.series([
		function( callback ) {
			grunt.log.writeln( "Building jQuery UI" );
			grunt.utils.spawn({
				cmd: "grunt",
				args: [ "manifest" ],
				opts: {
					cwd: "tmp/jquery-ui"
				}
			}, log( callback, "Done building manifest", "Error building manifest" ) );
		},
		function( callback ) {
			grunt.utils.spawn({
				cmd: "grunt",
				args: [ "release" ],
				opts: {
					cwd: "tmp/jquery-ui"
				}
			}, log( callback, "Done building release", "Error building release" ) );
		},
		function() {
			grunt.log.writeln( "Building API documentation for jQuery UI" );
			if ( !fs.existsSync( "tmp/api.jqueryui.com/config.json" ) ) {
				grunt.file.copy( "tmp/api.jqueryui.com/config-sample.json", "tmp/api.jqueryui.com/config.json" );
				grunt.log.writeln( "Copied config-sample.json to config.json" );
			}
			grunt.utils.spawn({
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
		var version = grunt.file.readJSON( "tmp/jquery-ui/package.json" ).version;
		var dir = require( "path" ).basename( "tmp/jquery-ui/dist/jquery-ui-" + version ),
			docs = "tmp/api.jqueryui.com/dist/wordpress/posts/post";
		grunt.file.mkdir( "release" );
		async.series([
			function( callback ) {
				if ( fs.existsSync( "release/" + ref ) ) {
					grunt.log.writeln( "Cleaning up existing release/" + ref );
					grunt.utils.spawn({
						cmd: "rm",
						args: [ "-Rf", ref ],
						opts: {
							cwd: "release"
						}
					}, log( callback, "Cleaned", "Error cleaning" ) );
				} else {
					callback();
				}
			},
			function( callback ) {
				grunt.log.writeln( "Copying jQuery UI " + version + " over to release/" + ref );
				grunt.utils.spawn({
					cmd: "cp",
					args: [ "-r", "tmp/jquery-ui/dist/" + dir, "release/" + ref ]
				}, log( callback, "Done copying", "Error copying" ) );
			},
			function() {
				grunt.log.writeln( "Copying API documentation for jQuery UI over to release/" + ref + "/docs/" );
				grunt.file.expandFiles( docs + "/**" ).forEach(function( file ) {
					grunt.file.copy( file, file.replace( docs, "release/" + ref + "/docs/" ));
				});
				callback();
			}
		]);
	}
}

// The ref parameter exists purely for local testing.
// Production should always use the config values.
grunt.registerTask( "prepare", "Fetches and builds jQuery UI releases specified in config file", function() {
	var done = this.async();
	async.series([
		setup,
		cloneOrFetch,
		buildAll
	], function( err ) {
		done( err ? false : true );
	});
});

grunt.registerTask( "build", "Builds zip package with all components selected and base theme, inside the given folder", function( folder ) {
	var done = this.async(),
		Builder = require( "./lib/builder" ),
		fs = require( "fs" ),
		path = require( "path" ),
		release = require( "./lib/release" ).all()[ 0 ],
		ThemeRoller = require( "./lib/themeroller" ),
		allComponents = release.components().map(function( component ) {
			return component.name;
		}),
		theme = new ThemeRoller(),
		builder = new Builder( allComponents, theme ),
		filename = path.join( folder, builder.filename() ),
		stream;

	grunt.log.ok( "Building \"" + filename + "\" with all components selected and base theme" );
	if ( fs.existsSync( filename ) ) {
		grunt.log.error( "Build: \"" + filename + "\" already exists" );
		done( false );
		return;
	}
	stream = fs.createWriteStream( filename );
	builder.writeTo( stream, function( err, result ) {
		if ( err ) {
			grunt.log.error( "Build: " + err.message );
			done( false );
			return;
		}
		stream.on( "close", function() {
			done();
		});
		stream.on( "error", function() {
			done( false );
		});
		stream.end();
	});
});

};
