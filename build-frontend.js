var fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	homeTemplate = handlebars.compile( fs.readFileSync( __dirname + "/build-frontend.html", "utf8" ) ),
	wrapperTemplate = handlebars.compile( fs.readFileSync( __dirname + "/build-frontend-wrapper.html", "utf8" ) ),
	categories = require( __dirname + "/manifest" ).categories();

module.exports = function() {
	return homeTemplate( {
		categories: categories
	});
};
module.exports.wrapped = function() {
	return wrapperTemplate({
		body: module.exports()
	});
};