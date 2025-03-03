"use strict";

module.exports = {
	compress: {
		ecma: 5,
		hoist_funs: false,
		loops: false
	},
	format: {
		ecma: 5,
		asciiOnly: true,

		// That only preserves license comments.
		// See https://swc.rs/docs/configuration/minification#note-about-comments
		comments: true
	},
	inlineSourcesContent: false,
	mangle: true,
	module: false,
	sourceMap: false
};
