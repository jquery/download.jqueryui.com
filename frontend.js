var fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	homeTemplate = handlebars.compile( fs.readFileSync( __dirname + "/template/frontend_body.html", "utf8" ) ),
	wrapperTemplate = handlebars.compile( fs.readFileSync( __dirname + "/template/frontend.html", "utf8" ) ),
	categories = require( "./lib/manifest" ).categories();

module.exports = function( action ) {
	return homeTemplate( {
		action: action || "/download",
		categories: categories
	});
};
module.exports.wrapped = function() {
	return wrapperTemplate({
		body: module.exports()
	});
};
