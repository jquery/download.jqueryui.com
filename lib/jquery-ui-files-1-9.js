var commonFiles, componentFiles, flatten, glob, isDirectory, noDirectory, testFiles,
	Files = require( "./files" ),
	util = require( "./util" );

flatten = util.flatten;
glob = util.glob;
isDirectory = util.isDirectory;
noDirectory = util.noDirectory;

commonFiles = [
	"AUTHORS.txt",
	"grunt.js",
	"jquery-*.js",
	"MIT-LICENSE.txt",
	"package.json",
	"README.md",
	"external/*",
	"demos/demos.css",
	"demos/images/*",
	"themes/base/jquery.ui.all.css",
	"themes/base/jquery.ui.base.css",
	"themes/base/jquery.ui.theme.css",
	"themes/base/images/*"
];
componentFiles = [
	"*jquery.json",
	"ui/*.js",
	"themes/base/jquery*"
];
testFiles = [
	"tests/**",
	"ui/.jshintrc"
];

/**
 * JqueryUiFiles 1.9.0
 */
function JqueryUiFiles_1_9_0( jqueryUi ) {
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

	this.demoFiles = Files( glob( jqueryUi.path + "demos/*/**" ).filter( noDirectory ).map( stripJqueryUiPath ).map( readFile ) );

	this.docFiles = Files( glob( jqueryUi.path + "docs/*" ).map( stripJqueryUiPath ).map( readFile ) );

	this.i18nFiles = Files( glob( jqueryUi.path + "ui/i18n/*" ).map( stripJqueryUiPath ).map( readFile ) );

	this.testFiles = testFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	}).reduce( flatten, Files() );

	this.baseThemeFiles = Files( glob( jqueryUi.path + "themes/base/**" ).filter( noDirectory ).map( stripJqueryUiPath ).map( readFile ) );

	this.jqueryCore = Files( glob( jqueryUi.path + "jquery-*" ).map( stripJqueryUiPath ).map( readFile ) );

	// Auxiliary variables
	this.baseThemeCss = this.get( "themes/base/jquery.ui.theme.css" );
	this.demoSubdirs = glob( jqueryUi.path + "demos/*" ).filter( isDirectory ).map(function( filepath ) {
		// Get basename only with no trailing slash
		return path.basename( filepath ).replace( /\/$/, "" );
	}).sort();
}

module.exports = JqueryUiFiles_1_9_0;
