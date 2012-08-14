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

function successOrError( successMsg, success, errorMsg, error ) {
	return function( errorResult, doneResult ) {
		if ( errorResult ) {
			grunt.log.error( errorMsg + " - " + errorResult.stderr );
			if ( error ) {
				error( errorResult );
			}
		} else {
			grunt.log.ok( successMsg );
			if ( success ) {
				success( doneResult );
			}
		}
	};
}

function cloneOrFetch( success, error ) {
	var fs = require( "fs" );
	if ( fs.existsSync( "jquery-ui" ) ) {
		grunt.log.writeln( "Fetch updates for jquery-ui repo" );
		grunt.utils.spawn({
			cmd: "git",
			args: [ "fetch" ],
			opts: {
				cwd: "jquery-ui"
			}
		}, successOrError( "Fetched repo", success, "Error fetching repo", error ) );
	} else {
		grunt.log.writeln( "Cloning jquery-ui repo" );
		grunt.utils.spawn({
			cmd: "git",
			args: [ "clone", "git://github.com/jquery/jquery-ui.git", "jquery-ui" ]
		}, successOrError( "Cloned repo", success, "Error cloning repo", error ) );
	}
}

function checkout( branchOrTag, success, error ) {
	grunt.log.writeln( "Checking out branch/tag: " + branchOrTag );
	grunt.utils.spawn({
		cmd: "git",
		args: [ "checkout", "-f", "origin/" + branchOrTag ],
		opts: {
			cwd: "jquery-ui"
		}
	}, successOrError( "Done with checkout", success, "Error checking out", error ) );
}

function install( success, error ) {
	grunt.log.writeln( "Installing npm modules" );
	grunt.utils.spawn({
		cmd: "npm",
		args: [ "install" ],
		opts: {
			cwd: "jquery-ui"
		}
	}, successOrError( "Installed npm modules", success, "Error installing npm modules", error ) );
}

function build( success, error ) {
	grunt.log.writeln( "Building jQuery UI" );
	grunt.utils.spawn({
		cmd: "grunt",
		args: [ "manifest" ],
		opts: {
			cwd: "jquery-ui"
		}
	}, function() {
		grunt.utils.spawn({
			cmd: "grunt",
			args: [ "release" ],
			opts: {
				cwd: "jquery-ui"
			}
		}, successOrError( "Done building", success, "Error building", error ) );
	});
}

function copy( success, error ) {
	var dir = require( "path" ).basename( grunt.file.expandDirs( "jquery-ui/dist/jquery-ui-*" )[ 0 ] );
	grunt.utils.spawn({
		cmd: "cp",
		args: [ "-r", "jquery-ui/dist/" + dir, "versions/" + dir ]
	}, successOrError( "Copied release over to versions/" + dir, success, "Error copying release over to versions/" + dir, error ) );
}

grunt.registerTask( "prepare", "Fetches jQuery UI and builds the specified branch or tag", function( branchOrTag ) {
	var done = this.async();
	grunt.file.mkdir( "versions" );
	cloneOrFetch(function() {
		checkout( branchOrTag, function() {
			install(function() {
				build(function() {
					copy( done );
				});
			});
		});
	});
});

};
