var fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	bodyTemplate = handlebars.compile( fs.readFileSync( __dirname + "/template/download/body.html", "utf8" ) ),
	indexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/template/download/index.html", "utf8" ) ),
	release = require( "./lib/release" ).all()[ 0 ];

module.exports = function( action ) {
	return bodyTemplate( {
		action: action || "/download",
		categories: release.categories(),
		pkg: release.pkg
	});
};
module.exports.index = function() {
	return indexTemplate({
		body: module.exports()
	});
};
