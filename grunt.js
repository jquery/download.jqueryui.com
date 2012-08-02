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

function cloneOrFetch( callback ) {
	var fs = require( "fs" );
	if ( fs.existsSync( "jquery-ui" ) ) {
		grunt.log.writeln( "Fetch updates for jquery-ui repo" );
		grunt.utils.spawn({
			cmd: "git",
			args: [ "fetch" ],
			opts: {
				cwd: "jquery-ui"
			}
		}, function() {
			grunt.log.ok( "Fetched repo" );
			callback();
		});
	} else {
		grunt.log.writeln( "Cloning jquery-ui repo" );
		grunt.utils.spawn({
			cmd: "git",
			args: [ "clone", "git://github.com/jquery/jquery-ui.git", "jquery-ui" ]
		}, function() {
			grunt.log.ok( "Cloned repo" );
			callback();
		});
	}
}

function checkout( branchOrTag, callback ) {
	grunt.log.writeln( "Checking out branch/tag: " + branchOrTag );
	grunt.utils.spawn({
		cmd: "git",
		args: [ "checkout", "-f", "origin/" + branchOrTag ],
		opts: {
			cwd: "jquery-ui"
		}
	}, function() {
		grunt.log.ok( "Done with checkout" );
		callback();
	});
}

function install( callback ) {
	grunt.log.writeln( "Installing npm modules" );
	grunt.utils.spawn({
		cmd: "npm",
		args: [ "install" ],
		opts: {
			cwd: "jquery-ui"
		}
	}, function() {
		grunt.log.ok( "Installed npm modules" );
		callback();
	});
}

function build( callback ) {
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
		}, function() {
			grunt.log.ok( "Done building" );
			callback();
		});
	});
}

function copy( callback ) {
	var dir = require( "path" ).basename( grunt.file.expandDirs( "jquery-ui/dist/jquery-ui-*" )[ 0 ] );
	grunt.utils.spawn({
		cmd: "cp",
		args: [ "-r", "jquery-ui/dist/" + dir, "versions/" + dir ]
	}, function() {
		grunt.log.ok( "Copied release over to versions/" + dir );
		callback();
	});
}

grunt.registerTask( "prepare", "Fetches jQuery UI and builds the specified branch or tag", function( branchOrTag ) {
	var done = this.async();
	grunt.file.mkdir( "versions" );
	cloneOrFetch(function( error, output ) {
		checkout( branchOrTag, function( error, output ) {
			install(function() {
				build(function() {
					copy( done );
				});
			});
		});
	});
});

};
