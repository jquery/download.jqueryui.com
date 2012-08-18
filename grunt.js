var async = require( "async" );
var fs = require( "fs" );

module.exports = function(grunt) {

grunt.initConfig({
	pkg: "<json:package.json>",
	lint: {
		files: [ "*.js", "app/**/*.js" ]
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
					args: [ "fetch" ],
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

function checkout( branchOrTag ) {
	return function( callback ) {
		async.series([
			function( callback ) {
				grunt.log.writeln( "Checking out jquery-ui branch/tag: " + branchOrTag );
				grunt.utils.spawn({
					cmd: "git",
					args: [ "checkout", "-f", "origin/" + branchOrTag ],
					opts: {
						cwd: "tmp/jquery-ui"
					}
				}, log( callback, "Done with checkout", "Error checking out" ) );
			},
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
		function() {
			grunt.log.writeln( "Installing api.jqueryui.com npm modules" );
			grunt.utils.spawn({
				cmd: "npm",
				args: [ "install" ],
				opts: {
					cwd: "tmp/api.jqueryui.com"
				}
			}, log( callback, "Installed npm modules", "Error installing npm modules" ) );
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

function copy( callback ) {
	var dir = require( "path" ).basename( grunt.file.expandDirs( "tmp/jquery-ui/dist/jquery-ui-*" )[ 0 ] );
	grunt.file.mkdir( "release" );
	async.series([
		function( callback ) {
			grunt.log.writeln( "Copying jQuery UI release over to release/" + dir );
			grunt.utils.spawn({
				cmd: "cp",
				args: [ "-r", "tmp/jquery-ui/dist/" + dir, "release/" + dir ]
			}, log( callback, "Done copying", "Error copying" ) );
		},
		function() {
			grunt.log.writeln( "Copying API documentation for jQuery UI over to release/" + dir + "docs/" );
			grunt.utils.spawn({
				cmd: "cp",
				args: [ "-r", "tmp/api.jqueryui.com/dist/wordpress/posts/post/", "release/" + dir + "docs/" ]
			}, log( callback, "Done copying", "Error copying" ) );
		}
	]);
}

grunt.registerTask( "prepare", "Fetches jQuery UI and builds the specified branch or tag", function( branchOrTag ) {
	var done = this.async();
	async.series([
    setup,
		cloneOrFetch,
		checkout( branchOrTag ),
		install,
		build,
		copy
	], done );
});

};
