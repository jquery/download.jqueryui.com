var uglifyjs = require('uglify-js'),
	uglify = uglifyjs.uglify;
module.exports = function( src ) {
	var result,
		ast = uglifyjs.parser.parse( src );
	ast = uglify.ast_mangle( ast, {} );
	ast = uglify.ast_squeeze( ast, {}) ;
	result = uglify.gen_code( ast, {} );
	// UglifyJS adds a trailing semicolon only when run as a binary.
	// So we manually add the trailing semicolon when using it as a module.
	// https://github.com/mishoo/UglifyJS/issues/126
	return result + ';';
};
