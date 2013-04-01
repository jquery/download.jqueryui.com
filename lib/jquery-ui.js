var commonFiles, componentFiles, virtualFiles,
	_ = require( "underscore" ),
	config = require( "./config" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	categories = {
		core: {
			name: "UI Core",
			description: "A required dependency, contains basic functions and initializers.",
			order: 0
		},
		interaction: {
			name: "Interactions",
			description: "These add basic behaviors to any element and are used by many components below.",
			order: 1
		},
		widget: {
			name: "Widgets",
			description: "Full-featured UI Controls - each has a range of options and is fully themeable.",
			order: 2
		},
		effect: {
			name: "Effects",
			description: "A rich effect API and ready to use effects.",
			order: 3
		}
	},
	orderedComponents = "core widget mouse position".split( " " ),
	filesCache = {};

function dependencies( manifest ) {
	var result = [],
		component;
	for ( component in manifest.dependencies ) {
		if ( component !== "jquery" ) {
			result.push( component.replace( /ui\./, "" ) );
		}
	}
	return result;
}

function flatten( flat, arr ) {
	return flat.concat( arr );
}

function noDirectory( filepath ) {
	return ! fs.statSync( filepath ).isDirectory();
}

commonFiles = [
	"*",
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
	"ui/**",
	"themes/base/jquery*"
];
virtualFiles = {
	commonFiles: {
		"dist/themes/base/minified/jquery.ui.theme.min.css": {
			strip: /^dist\//,
			dest: ""
		},
		"themes/base/images/*": {
			strip: /^themes\/base\//,
			dest: "themes/base/minified/"
		}
	},
	componentFiles: {
		"dist/minified/**/*": {
			strip: /^dist/,
			dest: "ui"
		},
		"dist/themes/base/minified/jquery*": {
			strip: /^dist\//,
			dest: ""
		}
	},
	themeFiles: {
		"dist/themes/base/minified/jquery*": {
			strip: /^dist\//,
			dest: ""
		}
	},
	etc: {
		"dist/i18n/jquery-ui-i18n.js": "ui/i18n/jquery-ui-i18n.js",
		"dist/i18n/jquery-ui-i18n.min.js": "ui/minified/i18n/jquery-ui-i18n.min.js",
		"dist/themes/base/minified/jquery.ui.theme.min.css": "themes/base/minified/jquery.ui.theme.min.css"
	}
};

/**
 * JqueryUiFiles
 */
function JqueryUiFiles( jqueryUiPath ) {
	var self = this,
		cacheIt = function( srcpath, destpath ) {
			if ( typeof destpath !== "string" ) {
				destpath = srcpath;
			}
			filesCache[ jqueryUiPath ][ destpath ] = fs.readFileSync( jqueryUiPath + srcpath );
		},
		path = require( "path" ),
		stripJqueryUiPath = function( filepath ) {
			return path.relative( jqueryUiPath, filepath );
		};

	this.data = filesCache[ jqueryUiPath ] = {};

	this.commonFiles = commonFiles.map(function( path ) {
		return glob( jqueryUiPath + path ).filter( noDirectory ).map( stripJqueryUiPath );
	}).reduce( flatten, [] );

	this.componentFiles = componentFiles.map(function( path ) {
		return glob( jqueryUiPath + path ).filter( noDirectory ).map( stripJqueryUiPath );
	}).reduce( flatten, [] );

	this.demoFiles = glob( jqueryUiPath + "demos/*/**" ).filter( noDirectory ).map( stripJqueryUiPath );

	this.docFiles = glob( jqueryUiPath + "docs/*" ).map( stripJqueryUiPath );

	// Cache them
	this.commonFiles.forEach( cacheIt );
	this.componentFiles.forEach( cacheIt );
	this.demoFiles.forEach( cacheIt );
	this.docFiles.forEach( cacheIt );

	// Auxiliary variables
	this.jqueryFilename = stripJqueryUiPath( glob( jqueryUiPath + "jquery-*" )[ 0 ] );
	this.themeFiles = glob( jqueryUiPath + "themes/base/**" ).filter( noDirectory ).map( stripJqueryUiPath );

	// Include virtual files
	Object.keys( virtualFiles ).forEach(function( group ) {
		Object.keys( virtualFiles[ group ] ).forEach(function( src ) {
			var dest = virtualFiles[ group ][ src ],
				include = function( src, dest ) {
					if ( group === "commonFiles" ) {
						self.commonFiles.push( dest );
					} else if ( group === "componentFiles" ) {
						self.componentFiles.push( dest );
					} else if ( group === "themeFiles" ) {
						self.themeFiles.push( dest );
					} else if ( group !== "etc" ) {
						throw new Error( "Don't know what to do with " + group + " " + dest );
					}
					cacheIt( src, dest );
				};
			if ( typeof dest === "string" ) {
				// data[ dest ] -> open( src )
				include( src, dest );
			} else {
				// data[ src.replace( strip ) + dest ] -> open( src )
				glob( jqueryUiPath + src ).filter( noDirectory ).map( stripJqueryUiPath ).forEach(function( src ) {
					include( src, src.replace( dest.strip, dest.dest ) );
				});
			}
		});
	});
}


/**
 * JqueryUi
 */
function JqueryUi( path, options ) {
	this.dependsOn = options.dependsOn;
	this.stable = options.stable;
	this.label = this.stable ? "Stable" : "Legacy";
	this.path = path;
	this.pkg = JSON.parse( fs.readFileSync( path + "/package.json" ) );
	this.manifests = glob( this.path + "/*.jquery.json" ).map(function( filepath ) {
		return JSON.parse( fs.readFileSync( filepath ) );
	});
}

JqueryUi.all = function() {
	if ( !JqueryUi._all ) {
		JqueryUi._all = config().jqueryUi.map(function( jqueryUi ) {
			// 1: Allow config to override path, used by jQuery UI release process to generate themes.
			var path = ( jqueryUi.path /* 1 */ || __dirname + "/../release/" + jqueryUi.ref ) + "/";
			if ( !fs.existsSync( path ) ) {
				throw new Error( "Missing ./" + require( "path" ).relative( __dirname, path ) + " folder. Run `grunt prepare` first, or fix your config file." );
			}
			if ( !fs.existsSync( path + "package.json" ) ) {
				throw new Error( "Invalid ./" + require( "path" ).relative( __dirname, path ) + " folder. Run `grunt prepare` first, or fix your config file." );
			}
			return new JqueryUi( path, jqueryUi );
		});
	}
	return JqueryUi._all;
};

JqueryUi.getStable = function() {
	return JqueryUi.all()[ 0 ];
};

JqueryUi.find = function( version ) {
	if ( !version ) {
		throw new Error( "Invalid version argument: " + version );
	}
	var match = JqueryUi.all().filter(function( jqueryUi ) {
		return jqueryUi.pkg.version === version;
	});
	if ( !match.length ) {
		throw new Error( "Didn't find a jqueryUi for version: " + version );
	}
	return match[ 0 ];
};

JqueryUi.prototype = {
	categories: function() {
		if ( !this._categories ) {
			var map = {};
			this._categories = this.components().reduce(function( arr, component ) {
				if ( !map[ component.category ] ) {
					var category = _.extend({
						components: []
					}, categories[component.category]);
					map[ component.category ] = category;
					arr.push( category );
				}
				map[ component.category ].components.push( component );
				return arr;
			}, [] ).sort(function( a, b ) {
				return a.order - b.order;
			});
		}
		return this._categories;
	},

	components: function() {
		if ( !this._components ) {
			this._components = this.manifests.map(function( manifest ) {
				return {
					name: manifest.name.replace( /ui\./, "" ),
					title: manifest.title.replace( /^jQuery UI /, ""),
					description: manifest.description,
					category: manifest.category,
					dependencies: dependencies( manifest )
				};
			}).sort(function( a, b ) {
				var aOrder = orderedComponents.indexOf( a.name ),
						bOrder = orderedComponents.indexOf( b.name );
				// Precedence is 1st orderedComponents, 2nd alphabetical.
				if ( aOrder >= 0 && bOrder >= 0 ) {
					return aOrder - bOrder;
				} else if ( aOrder >= 0 ) {
					return -1;
				} else if ( bOrder >= 0 ) {
					return 1;
				} else {
					return  a.name > b.name ? 1 : -1;
				}
			});
		}
		return this._components;
	},

	files: function() {
		if ( !this._files ) {
			this._files = new JqueryUiFiles( this.path );
		}
		return this._files;
	}
};

module.exports = JqueryUi;
