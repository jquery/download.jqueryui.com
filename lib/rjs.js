var rjs,
	fs = require( "fs" ),
	requirejs = require( "requirejs" );

// TODO overload "node/file" to skip filesystem and use memory instead.
// requirejs.define( "node/file", [ "js", "path", "prim" ], function( fs, path, prim ) {
// }

rjs = function( attributes, callback ) {
	// TODO validate attributes, return if attributes.include.empty? stuff like that

	fs.writeFileSync( attributes.baseUrl + "/dist/tmp/main.js", "require([\n\t\"jqueryui/jquery.ui." + attributes.include.join( "\",\n\t\"jqueryui/jquery.ui." ) + "\"\n]);" );

	requirejs.optimize({
		dir: attributes.baseUrl + "/dist/build",
		appDir: attributes.baseUrl + "/ui",
		baseUrl: ".",
		optimize: "none",
		optimizeCss: "none",
		paths: {
			jquery: "../jquery-1.9.1",
			jqueryui: ".",
			tmp: "../dist/tmp"
		},
		modules: [{
			name: "../output",
			include: [ "tmp/main" ],
			exclude: attributes.exclude,
			create: true
		}],
		wrap: {
			start: "(function( $ ) {",
			end: "})( jQuery );"
		},
		onBuildWrite: function ( id, path, contents ) {
			if ( (/define\([\s\S]*?factory/).test( contents ) ) {
				// Remove UMD wrapper
				contents = contents.replace( /\(function\( factory[\s\S]*?\(function\( \$ \) \{/, "" );
				contents = contents.replace( /\}\)\);\s*?$/, "" );
			}
			else if ( (/^require\(\[/).test( contents ) ) {
				// Replace require with comment `//` instead of null string, because of the mysterious semicolon
				contents = contents.replace( /^require[\s\S]*?\]\);$/, "// mysterious semicolon: " );
			}
			return contents;
		}
	}, function() {

		// Remove `define("main" ...)` and `define("jquery-ui" ...)`
		var contents = fs.readFileSync( attributes.baseUrl + "/dist/output.js", "utf8" ).replace( /define\("(tmp\/main|\.\.\/output)", function\(\)\{\}\);/g, "" );

		// Remove the mysterious semicolon `;` character left from require([...]);
		contents = contents.replace( /\/\/ mysterious semicolon.*/g, "" );

		callback( null, contents );
	}, callback );
};

module.exports = rjs;
