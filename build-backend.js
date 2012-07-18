/*jshint node: true */
"use strict";

var spawn = require( "child_process" ).spawn,
	fs = require( "fs" ),
	rimraf = require( "rimraf" ),
	async = require( "async" ),
	handlebars = require( "handlebars" ),
	glob = require( "glob-whatev" ).glob;

var indexTemplate = handlebars.compile( fs.readFileSync( "zip-index.html", "utf8" ) );

function Builder( fields ) {
	// TODO make sure fields are ordered based on dependencies
	this.fields = fields;
}
Builder.prototype = {
	// TODO make everything ASYNC
	build: function( callback ) {
		var tmpdir = "tmp" + (+new Date()),
			target = "jquery-ui-custom",
			input = "versions/jquery-ui-1.9.0pre",
			targetdir = tmpdir + "/" + target + "/";
		fs.mkdirSync( tmpdir );
		fs.mkdirSync( targetdir );
		fs.mkdirSync( targetdir + "minified" );

		// TODO exclude or filter *.jquery.json files
		fs.mkdirSync( targetdir + "development-bundle" );
		glob( "versions/jquery-ui-1.9.0pre/*.*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace(input, "development-bundle"), fs.readFileSync( file ) );
		});

		fs.mkdirSync( targetdir + "development-bundle/external" );
		glob( input + "/external/*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace(input, "development-bundle"), fs.readFileSync( file ) );
		});

		fs.mkdirSync( targetdir + "development-bundle/demos" );
		fs.writeFileSync( targetdir + "development-bundle/demos/demos.css", fs.readFileSync( input + "/demos/demos.css" ) );
		fs.writeFileSync( targetdir + "development-bundle/demos/index.html", fs.readFileSync( input + "/demos/index.html" ) );
		fs.mkdirSync( targetdir + "development-bundle/demos/images" );
		glob( input + "/demos/images/*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace(input, "development-bundle"), fs.readFileSync( file ) );
		});

		var meta = {
			jquery: {
				version: "1.7.2"
			},
			ui: {
				version: "1.9.0"
			}
		};
		fs.mkdirSync( targetdir + "development-bundle/ui" );
		fs.mkdirSync( targetdir + "development-bundle/ui/minified" );
		// TODO replicate banner generation from grunt build
		var concatFiles = "/* jQuery UI custom */\n";
		this.fields.forEach(function( field ) {
			meta.ui[ field ] = true;

			var file = "ui/jquery.ui." + field + ".js";
			var content = fs.readFileSync( input + "/" + file );
			// TODO strip banner
			concatFiles += content;
			fs.writeFileSync( targetdir + "development-bundle/" + file, content );

			var minfile = "ui/minified/jquery.ui." + field + ".min.js";
			fs.writeFileSync( targetdir + "development-bundle/" + minfile, fs.readFileSync( input + "/" + minfile ) );

			if ( fs.existsSync( input + "/demos/" + field ) ) {
				fs.mkdirSync( targetdir + "development-bundle/demos/" + field );
				glob( input + "/demos/" + field + "/**" ).forEach(function( file ) {
					if ( fs.statSync( file ).isDirectory() ) {
						fs.mkdirSync( targetdir + file.replace(input, "development-bundle") );
					} else {
						fs.writeFileSync( targetdir + file.replace(input, "development-bundle"), fs.readFileSync( file ) );
					}
				});
			}
		});
		fs.writeFileSync( targetdir + "development-bundle/ui/jquery-ui-" + meta.ui.version + ".custom.js", concatFiles );

		fs.writeFileSync( targetdir + "index.html", indexTemplate( meta ) );
		fs.mkdirSync( targetdir + "js" );
		fs.writeFileSync( targetdir + "js/jquery-" + meta.jquery.version + ".js", fs.readFileSync( input + "/jquery-" + meta.jquery.version + ".js" ) );

		fs.writeFileSync( targetdir + "js/jquery-ui-" + meta.ui.version + ".custom.js", fs.readFileSync( input + "/ui/jquery-ui.js" ) );
		fs.writeFileSync( targetdir + "js/jquery-ui-" + meta.ui.version + ".custom.min.js", fs.readFileSync( input + "/ui/minified/jquery-ui.min.js" ) );

		fs.mkdirSync( targetdir + "css" );
		fs.mkdirSync( targetdir + "css/base" );
		fs.writeFileSync( targetdir + "css/base/jquery-ui-" + meta.ui.version + ".custom.css", fs.readFileSync( input + "/themes/base/jquery-ui.css" ) );
		fs.writeFileSync( targetdir + "css/base/jquery-ui-" + meta.ui.version + ".custom.min.css", fs.readFileSync( input + "/themes/base/minified/jquery-ui.min.css" ) );

		fs.mkdirSync( targetdir + "css/base/images" );
		glob( input + "/themes/base/images/*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace(input + "/themes", "css"), fs.readFileSync( file ) );
		});

		callback( tmpdir, target );
	},
	writeTo: function( response, callback ) {
		var that = this;
		this.build(function( cwd, target ) {
			var child = spawn( "zip", [ "-r", "-", target ], { cwd: cwd } );
			child.stdout.on( "data", function( data) {
				response.write( data );
			});
			child.stderr.on( "data", function( data) {
				// console.error( data.toString() );
			});
			child.on( "exit", function( code ) {
				rimraf.sync( cwd );
				if ( code !== 0 ) {
					callback( "zip failed :(" );
					return;
				}
				callback( null, "All good!" );
			});
		});
	}
};

module.exports = Builder;