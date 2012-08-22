var fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	homeTemplate = handlebars.compile( fs.readFileSync( __dirname + "/template/frontend_body.html", "utf8" ) ),
	wrapperTemplate = handlebars.compile( fs.readFileSync( __dirname + "/template/frontend.html", "utf8" ) ),
	release = require( "./lib/release" ).all()[ 0 ];

module.exports = function( action ) {
	return homeTemplate( {
		action: action || "/download",
		categories: release.categories(),
		pkg: release.pkg
	});
};
module.exports.wrapped = function() {
	return wrapperTemplate({
		body: module.exports()
	});
};
