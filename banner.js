var dateformat = require( "dateformat" ),
	_ = require( "underscore" );

function today(format) {
  return dateformat(new Date(), format);
}

module.exports = function( pkg, fields ) {
	var fileNames = fields.map(function( field ) {
		return "jquery.ui." + field + ".js";
	});
	return "/*! " + (pkg.title || pkg.name) + " - v" + pkg.version + " - " +
		today('isoDate') + "\n" +
		"* " + pkg.homepage + "\n" +
		"* Includes: " + fileNames.join(", ") + "\n" +
		"* Copyright (c) " + today('yyyy') + " " + pkg.author.name +
		" Licensed " + _.pluck(pkg.licenses, 'type').join(', ') + " */";
};

// console.log(module.exports({
// 	title: "jQuery UI",
// 	version: "1.9.0",
// 	homepage: "http://jqueryui.com",
// 	author: {
// 		name: "authors.txt"
// 	},
// 	licenses: [
// 		{
// 			type: "MIT"
// 		},
// 		{
// 			type: "GPL"
// 		}
// 	]
// }, ["autocomplete", "accordion"]));