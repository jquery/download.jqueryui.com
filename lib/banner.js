var dateformat = require( "dateformat" ),
	_ = require( "underscore" );

function today(format) {
	return dateformat(new Date(), format);
}

module.exports = function( pkg, fileNames ) {
	return "/*! " + (pkg.title || pkg.name) + " - v" + pkg.version + " - " +
		today("isoDate") + "\n" +
		"* " + pkg.homepage + "\n" +
		"* Includes: " + fileNames.join(", ") + "\n" +
		"* Copyright " + today("yyyy") + " " + pkg.author.name +
		" Licensed " + _.pluck(pkg.licenses, "type").join(", ") + " */";
};
