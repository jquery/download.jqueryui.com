var commonFiles, componentFiles, flatten, glob, isDirectory, noDirectory, optional, testFiles,
	Docs = require( "./docs" ),
	Files = require( "./files" ),
	util = require( "./util" );

flatten = util.flatten;
glob = util.glob;
isDirectory = util.isDirectory;
noDirectory = util.noDirectory;
optional = util.optional;

commonFiles = [
	"AUTHORS.txt",
	"Gruntfile.js",
	"jquery.js",
	"MIT-LICENSE.txt",
	"package.json",
	"README.md",
	"external/*",
	"demos/demos.css",
	"demos/images/*",
	"themes/base/all.css",
	"themes/base/base.css",
	"themes/base/theme.css",
	"themes/base/images/*"
];
componentFiles = [
	"*jquery.json",
	"ui/*.js",
	"themes/base/*"
];
testFiles = [
	"tests/**",
	"ui/.jshintrc"
];

/**
 * JqueryUiFiles 1.11.0
 */
function JqueryUiFiles_1_11_0( jqueryUi ) {
	var readFile, stripJqueryUiPath,
		path = require( "path" );

	readFile = this.readFile;
	stripJqueryUiPath = this.stripJqueryUiPath;

	this.commonFiles = commonFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	}).reduce( flatten, Files() );

	this.componentFiles = componentFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	}).reduce( flatten, Files() );

	this.i18nFiles = Files( glob( jqueryUi.path + "ui/i18n/*" ).map( stripJqueryUiPath ).map( readFile ) );

	this.jqueryCore = Files( glob( jqueryUi.path + "jquery.js" ).map( stripJqueryUiPath ).map( readFile ) );

	// Auxiliary variables
	this.baseThemeCss = this.get( "themes/base/theme.css" );
}

module.exports = JqueryUiFiles_1_11_0;
