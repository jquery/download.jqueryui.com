var banner = require( "./lib/banner.js" );
console.log( banner({
	title: "jQuery UI",
	version: "1.9.0",
	homepage: "http://jqueryui.com",
	author: {
		name: "authors.txt"
	},
	licenses: [
		{
			type: "MIT"
		},
		{
			type: "GPL"
		}
	]
}, ["jquery.ui.autocomplete.js", "jquery.ui.accordion.js"] ) );
