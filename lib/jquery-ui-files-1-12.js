var glob, noDirectory,
	Files = require( "./files" ),
	util = require( "./util" );

glob = util.glob;
noDirectory = util.noDirectory;

/**
 * JqueryUiFiles 1.12.0
 */
function JqueryUiFiles_1_12_0( jqueryUi ) {
	var files, readFile, stripJqueryUiPath;

	readFile = this.readFile;
	stripJqueryUiPath = this.stripJqueryUiPath;

	glob( jqueryUi.path + "!(node_modules|build)" ).filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	glob( jqueryUi.path + "!(node_modules|build)/**" ).filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );

	this.componentFiles = Files( glob( jqueryUi.path + "ui/**/*.js" ).map( stripJqueryUiPath ).map( readFile ) );

	// Convert {path:<path>, data:<data>} into {path: <data>}.
	files = this.cache;
	this.cache = Object.keys( files ).reduce(function( _files, filepath ) {
		_files[ filepath ] = files[ filepath ].data;
		return _files;
	}, {} );

	this.baseThemeCss = {
		data: this.get( "themes/base/theme.css" )
	};
}

module.exports = JqueryUiFiles_1_12_0;
