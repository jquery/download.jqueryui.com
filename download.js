var fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	bodyTemplate = handlebars.compile( fs.readFileSync( __dirname + "/template/download/body.html", "utf8" ) ),
	indexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/template/download/index.html", "utf8" ) ),
	release = require( "./lib/release" ).all()[ 0 ];

// FIXME Is this module being used somewhere else? May I change the exports strucure?
module.exports = function( action, params ) {
	var themeGallery = [];
	if ( params.themeParams ) {
		themeGallery.push({
			name: "Custom Theme",
			url: params.themeParams
		});
	}
	return bodyTemplate( {
		action: action || "/download",
		categories: release.categories(),
		pkg: release.pkg,
		themeGallery: themeGallery
	});
};
module.exports.index = function( params ) {
	return indexTemplate({
		body: module.exports( "/download", params )
	});
};
