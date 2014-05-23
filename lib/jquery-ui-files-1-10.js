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
 * JqueryUiFiles 1.10.0
 */
function JqueryUiFiles_1_10_0( jqueryUi ) {
	var readFile, stripJqueryUiPath,
		path = require( "path" );

	readFile = this.readFile;
	stripJqueryUiPath = this.stripJqueryUiPath;

	this.commonFiles = commonFiles.map(function( path ) {
		return new Glob( jqueryUi.path + path, { sync: true} ).found.filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	}).reduce( flatten, Files() );

	this.componentFiles = componentFiles.map(function( path ) {
		return new Glob( jqueryUi.path + path, { sync: true } ).found.filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	}).reduce( flatten, Files() );

	this.demoFiles = Files( new Glob( jqueryUi.path + "demos/*/**", { sync: true }
  ).found.filter( noDirectory ).map( stripJqueryUiPath ).map( readFile ) );

	this.docFiles = Files( new Glob( jqueryUi.path + "docs/*", { sync: true }
  ).found.filter( noDirectory ).map( stripJqueryUiPath ).map( readFile ) );

	this.i18nFiles = Files( new Glob( jqueryUi.path + "ui/i18n/*", { sync: true }
  ).found.map( stripJqueryUiPath ).map( readFile ) );

	this.testFiles = testFiles.map(function( path ) {
		return new Glob( jqueryUi.path + path, { sync: true } ).found.filter( noDirectory ).map( stripJqueryUiPath ).map( readFile );
	}).reduce( flatten, Files() );

	this.baseThemeFiles = Files( new Glob( jqueryUi.path + "themes/base/**", {
  sync: true } ).found.filter( noDirectory ).map( stripJqueryUiPath ).map( readFile ) );

	this.jqueryCore = Files( new Glob( jqueryUi.path + "jquery-*", { sync: true }
  ).found.map( stripJqueryUiPath ).map( readFile ) );

	// Auxiliary variables
	this.baseThemeCss = this.get( "themes/base/jquery.ui.theme.css" );
	this.demoSubdirs = new Glob( jqueryUi.path + "demos/*", { sync: true } ).found.filter( isDirectory ).map(function( filepath ) {
		// Get basename only with no trailing slash
		return path.basename( filepath ).replace( /\/$/, "" );
	}).sort();
	this.docsCategories = Docs.categories( optional( jqueryUi.path + "docs/categories.json" ) );
}

module.exports = JqueryUiFiles_1_10_0;
