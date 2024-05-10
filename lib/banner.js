"use strict";

var template, templateMin,
	fs = require( "node:fs" ),
	handlebars = require( "handlebars" );

// 1: Currently, jQuery UI is using minified banners either for full or minified files. Anyway, DownloadBuilder is ready to support different banners.
template = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/banner.min" /* 1 */, "utf8" ) );
templateMin = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/banner.min", "utf8" ) );

function todayDate() {
	return new Date().toISOString().replace( /T.*$$/, "" );
}

function todayYear() {
	return `${ new Date().getFullYear() }`;
}

module.exports = function( pkg, fileNames, options ) {
	var render = template;
	options = options || {};
	if ( options.minify ) {
		render = templateMin;
	}
	return render( {
		authorName: pkg.author.name,
		customThemeUrl: options.customThemeUrl,
		date: todayDate(),
		fileNames: fileNames ? fileNames.join( ", " ) : null,
		homepage: pkg.homepage,
		licenses: pkg.license || pkg.licenses.map( ( { type } ) => type ).join( ", " ),
		title: pkg.title || pkg.name,
		version: pkg.version,
		year: todayYear()
	} );
};
