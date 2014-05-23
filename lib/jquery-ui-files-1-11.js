var commonFiles, componentFiles, flatten, isDirectory, noDirectory, optional, testFiles,
	Docs = require( "./docs" ),
	Files = require( "./files" ),
	Glob = require( "glob" ).Glob,
	util = require( "./util" );

flatten = util.flatten;
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
		return new Glob( jqueryUi.path + path, { sync: true } ).found.filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	}).reduce( flatten, Files() );

	this.componentFiles = componentFiles.map(function( path ) {
		return new Glob( jqueryUi.path + path, { sync: true } ).found.filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	}).reduce( flatten, Files() );

	this.i18nFiles = Files( new Glob( jqueryUi.path + "ui/i18n/*", { sync: true } ).found.map( stripJqueryUiPath ).map( readFile ) );

	this.jqueryCore = Files( new Glob( jqueryUi.path + "jquery.js", { sync: true } ).found.map( stripJqueryUiPath ).map( readFile ) );

	// Auxiliary variables
	this.baseThemeCss = this.get( "themes/base/theme.css" );
}

module.exports = JqueryUiFiles_1_11_0;
