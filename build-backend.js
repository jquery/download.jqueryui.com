/*jshint node: true */
"use strict";

var spawn = require( "child_process" ).spawn,
	fs = require( "fs" ),
	rimraf = require( "rimraf" ),
	async = require( "async" ),
	handlebars = require( "handlebars" ),
	glob = require( "glob-whatev" ).glob,
	minifier = require( "./minifier" ),
	banner = require( "./banner" );

// TODO include trailing slash here to rid it elsewhere
var input = "versions/jquery-ui-1.9.0pre";

var indexTemplate = handlebars.compile( fs.readFileSync( "zip-index.html", "utf8" ) ),
	pkg = JSON.parse( fs.readFileSync( input + "/package.json" ) );

function Builder( fields ) {
	// TODO make sure fields are ordered based on dependencies
	this.fields = fields;
}
Builder.prototype = {
	// TODO make everything ASYNC
	build: function( callback ) {
		var tmpdir = "tmp" + (+new Date()),
			target = "jquery-ui-custom",
			targetdir = tmpdir + "/" + target + "/";
		fs.mkdirSync( tmpdir );
		fs.mkdirSync( targetdir );

		// TODO exclude or filter *.jquery.json files
		fs.mkdirSync( targetdir + "development-bundle" );
		glob( input + "/*.*" ).forEach(function( file ) {
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

		var header = banner( pkg, this.fields ) + "\n";
		var concatFiles = header;
		this.fields.forEach(function( field ) {
			meta.ui[ field ] = true;

			var file = "ui/jquery.ui." + field + ".js";
			var content = fs.readFileSync( input + "/" + file, "utf-8" );
			concatFiles += content.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
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

			// TODO css files
		});

		fs.writeFileSync( targetdir + "development-bundle/ui/jquery-ui-" + meta.ui.version + ".custom.js", concatFiles );

		var minifiedConcatFiles = header + minifier( concatFiles );
		fs.writeFileSync( targetdir + "development-bundle/ui/minified/jquery-ui-" + meta.ui.version + ".custom.min.js", minifiedConcatFiles );

		fs.writeFileSync( targetdir + "index.html", indexTemplate( meta ) );
		fs.mkdirSync( targetdir + "js" );
		fs.writeFileSync( targetdir + "js/jquery-" + meta.jquery.version + ".js", fs.readFileSync( input + "/jquery-" + meta.jquery.version + ".js" ) );

		fs.writeFileSync( targetdir + "js/jquery-ui-" + meta.ui.version + ".custom.js", concatFiles );
		fs.writeFileSync( targetdir + "js/jquery-ui-" + meta.ui.version + ".custom.min.js", minifiedConcatFiles );

		fs.mkdirSync( targetdir + "css" );
		fs.mkdirSync( targetdir + "css/base" );
		// TODO use concatCssFiles and minifiedConcatCSsFiles
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