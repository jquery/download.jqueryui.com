/*jshint node: true */
"use strict";

var spawn = require( "child_process" ).spawn,
	fs = require( "fs" ),
	rimraf = require( "rimraf" ),
	async = require( "async" ),
	handlebars = require( "handlebars" ),
	glob = require( "glob-whatev" ).glob,
	banner = require( "./banner" );

var input = glob( "versions/*" )[0];

var indexTemplate = handlebars.compile( fs.readFileSync( "zip-index.html", "utf8" ) ),
	pkg = JSON.parse( fs.readFileSync( input + "/package.json" ) );

function stripBanner( src ) {
	return src.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
}

function Builder( fields ) {
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

		fs.mkdirSync( targetdir + "development-bundle" );
		glob( input + "/*.*" ).forEach(function( file ) {
			// would be nice if we could glob to do this for us
			if ( (/\.jquery\.json$/).test( file ) ) {
				return;
			}
			fs.writeFileSync( targetdir + file.replace(input, "development-bundle/"), fs.readFileSync( file ) );
		});

		fs.mkdirSync( targetdir + "development-bundle/external" );
		glob( input + "/external/*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace(input, "development-bundle/"), fs.readFileSync( file ) );
		});

		fs.mkdirSync( targetdir + "development-bundle/demos" );
		fs.writeFileSync( targetdir + "development-bundle/demos/demos.css", fs.readFileSync( input + "demos/demos.css" ) );
		fs.mkdirSync( targetdir + "development-bundle/demos/images" );
		glob( input + "/demos/images/*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace(input, "development-bundle/"), fs.readFileSync( file ) );
		});

		var ui = {
			version: pkg.version
		};
		fs.mkdirSync( targetdir + "development-bundle/ui" );
		fs.mkdirSync( targetdir + "development-bundle/ui/minified" );

		fs.mkdirSync( targetdir + "development-bundle/themes" );
		fs.mkdirSync( targetdir + "development-bundle/themes/base" );
		fs.mkdirSync( targetdir + "development-bundle/themes/base/images" );
		fs.mkdirSync( targetdir + "development-bundle/themes/base/minified" );
		fs.mkdirSync( targetdir + "development-bundle/themes/base/minified/images" );
		glob( input + "themes/base/images/*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace(input, "development-bundle/"), fs.readFileSync( file ) );
			fs.writeFileSync( targetdir + file.replace(input + "themes/base/", "development-bundle/themes/base/minified/"), fs.readFileSync( file ) );
		});

		var header = banner( pkg, this.fields.map(function( field ) {
			return "jquery.ui." + field + ".js";
		}) ) + "\n";
		var concatFiles = header,
			minifiedFiles = header,
			cssFields = [],
			cssConcatFiles = "",
			cssMinifiedFiles = "";
		this.fields.forEach(function( field ) {
			ui[ field ] = true;

			var file = "ui/jquery.ui." + field + ".js";
			var content = fs.readFileSync( input + file, "utf-8" );
			concatFiles += stripBanner( content );
			fs.writeFileSync( targetdir + "development-bundle/" + file, content );

			var minfile = "ui/minified/jquery.ui." + field + ".min.js";
			var minifiedContent = fs.readFileSync( input + minfile, "utf-8" );
			fs.writeFileSync( targetdir + "development-bundle/" + minfile, minifiedContent );
			minifiedFiles += stripBanner( minifiedContent );

			if ( fs.existsSync( input + "demos/" + field ) ) {
				fs.mkdirSync( targetdir + "development-bundle/demos/" + field );
				glob( input + "demos/" + field + "/**" ).forEach(function( file ) {
					if ( fs.statSync( file ).isDirectory() ) {
						fs.mkdirSync( targetdir + file.replace(input, "development-bundle/") );
					} else {
						fs.writeFileSync( targetdir + file.replace(input, "development-bundle/"), fs.readFileSync( file ) );
					}
				});
			}

			var jsonFile = input + "ui." + field + ".jquery.json";
			fs.writeFileSync( targetdir + jsonFile.replace(input, "development-bundle/"), fs.readFileSync( jsonFile ) );

			var cssFile = "themes/base/jquery.ui." + field + ".css";
			if ( fs.existsSync( input + cssFile )) {
				cssFields.push( field );
				var cssContent = fs.readFileSync( input + cssFile, "utf-8" );
				cssConcatFiles += stripBanner( cssContent );
				fs.writeFileSync( targetdir + "development-bundle/" + cssFile, cssContent );

				var cssMinfile = "themes/base/minified/jquery.ui." + field + ".min.css";
				var cssMinifiedContent = fs.readFileSync( input + cssMinfile, "utf-8" );
				fs.writeFileSync( targetdir + "development-bundle/" + cssMinfile, cssMinifiedContent );
				cssMinifiedFiles += stripBanner( cssMinifiedContent );
			}
		});

		fs.writeFileSync( targetdir + "development-bundle/ui/jquery-ui-" + ui.version + ".custom.js", concatFiles );
		fs.writeFileSync( targetdir + "development-bundle/ui/minified/jquery-ui-" + ui.version + ".custom.min.js", minifiedFiles );

		var cssHeader = banner( pkg, cssFields.map(function( field ) {
			return "jquery.ui." + field + ".css";
		}) ) + "\n";
		cssConcatFiles = cssHeader + cssConcatFiles;
		cssMinifiedFiles = cssHeader + cssMinifiedFiles;
		fs.writeFileSync( targetdir + "development-bundle/themes/base/jquery-ui-" + ui.version + ".custom.css", cssConcatFiles );
		fs.writeFileSync( targetdir + "development-bundle/themes/base/minified/jquery-ui-" + ui.version + ".custom.min.css", cssMinifiedFiles );

		fs.mkdirSync( targetdir + "js" );

		var jquery;
		glob( input + "/jquery-*.js" ).forEach(function( file ) {
			jquery = file.replace( input, "" );
			fs.writeFileSync( targetdir + file.replace( input, "js/" ), fs.readFileSync( file ) );
		});
		fs.writeFileSync( targetdir + "index.html", indexTemplate({
			jquery: jquery,
			ui: ui
		}) );

		fs.writeFileSync( targetdir + "js/jquery-ui-" + ui.version + ".custom.js", concatFiles );
		fs.writeFileSync( targetdir + "js/jquery-ui-" + ui.version + ".custom.min.js", minifiedFiles );

		fs.mkdirSync( targetdir + "css" );
		fs.mkdirSync( targetdir + "css/base" );
		fs.writeFileSync( targetdir + "css/base/jquery-ui-" + ui.version + ".custom.css", cssConcatFiles );
		fs.writeFileSync( targetdir + "css/base/jquery-ui-" + ui.version + ".custom.min.css", cssMinifiedFiles );

		fs.mkdirSync( targetdir + "css/base/images" );
		glob( input + "themes/base/images/*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace(input + "themes", "css"), fs.readFileSync( file ) );
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
				// rimraf.sync( cwd );
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