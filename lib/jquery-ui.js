var categories, commonFiles, componentFiles, flatten, orderedComponents, testFiles, virtualFiles,
	_ = require( "underscore" ),
	config = require( "./config" ),
	filesCache = {},
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	logger = require( "simple-log" ).init( "download.jqueryui.com" ),
	semver = require( "semver" ),
	sqwish = require( "sqwish" ),
	UglifyJS = require( "uglify-js" ),
	util = require( "./util" );

flatten = util.flatten;

function files() {
	var array = [];
	// Using concat to flatten arguments
	array = array.concat.apply( array, arguments );
	array.__proto__ = files.prototype;
	return array;
}

files.prototype = [];

files.prototype.concat = function() {
	return files( Array.prototype.concat.apply( this, arguments ) );
};

files.prototype.filter = function() {
	return files( Array.prototype.filter.apply( this, arguments ) );
};

files.prototype.map = function() {
	return files( Array.prototype.map.apply( this, arguments ) );
};

files.prototype.slice = function() {
	return files( Array.prototype.slice.apply( this, arguments ) );
};

files.prototype.into = function( newSubStrs ) {
	var self = this;
	return util.alwaysArray( newSubStrs ).map(function( newSubStr ) {
		return self.rename.call( self, /^/, newSubStr );
	}).reduce( flatten, files() );
};

files.prototype.paths = function() {
	return this.map(function( file ) {
		return file.path;
	});
};

files.prototype.rename = function( regExp, newSubStr ) {
	return this.map(function( file ) {
		return {
			path: file.path.replace( regExp, newSubStr ),
			data: file.data
		};
	});
};

files.prototype.tee = function( callback ) {
	callback( this.slice() );
	return this;
};

function isDirectory( filepath ) {
	return fs.statSync( filepath ).isDirectory();
}

function noDirectory( filepath ) {
	return ! fs.statSync( filepath ).isDirectory();
}

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
};

orderedComponents = "core widget mouse position".split( " " );

commonFiles = [
	"AUTHORS.txt",
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
	"ui/**",
	"themes/base/jquery*"
];
testFiles = [
	"tests/**",
	"ui/.jshintrc"
];

/**
 * JqueryUiFiles
 */
function JqueryUiFiles( jqueryUi ) {
	var self = this,
		file = function( srcpath ) {
			var destpath = srcpath;
			if ( !filesCache[ jqueryUi.path ][ destpath ] ) {
				filesCache[ jqueryUi.path ][ destpath ] = {
					path: destpath,
					data: readFile( jqueryUi.path + srcpath )
				};
			}
			return filesCache[ jqueryUi.path ][ destpath ];
		},
		path = require( "path" ),
		readFile = function( path ) {
			var data = fs.readFileSync( path );
			if ( (/(js|css)$/).test( path ) ) {
				data = replaceVersion( data.toString( "utf8" ) );
			}
			return data;
		},
		replaceVersion = function( data ) {
			return data.replace( /@VERSION/g, jqueryUi.pkg.version );
		},
		stripJqueryUiPath = function( filepath ) {
			return path.relative( jqueryUi.path, filepath );
		};

	if ( semver.gte( jqueryUi.pkg.version, "1.10.0" ) ) {
		commonFiles.push( "Gruntfile.js" );
	} else {
		commonFiles.push( "grunt.js" );
	}

	this.cache = filesCache[ jqueryUi.path ] = {};
	this.cache.minified = {};

	this.commonFiles = commonFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( file );
	}).reduce( flatten, files() );

	this.componentFiles = componentFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( file );
	}).reduce( flatten, files() );

	this.demoFiles = files( glob( jqueryUi.path + "demos/*/**" ).filter( noDirectory ).map( stripJqueryUiPath ).map( file ) );

	this.docFiles = files( glob( jqueryUi.path + "docs/*" ).map( stripJqueryUiPath ).map( file ) );

	this.i18nFiles = files( glob( jqueryUi.path + "ui/i18n/*" ).map( stripJqueryUiPath ).map( file ) );

	this.testFiles = testFiles.map(function( path ) {
		return glob( jqueryUi.path + path ).filter( noDirectory ).map( stripJqueryUiPath ).map( file );
	}).reduce( flatten, files() );

	this.baseThemeFiles = files( glob( jqueryUi.path + "themes/base/**" ).filter( noDirectory ).map( stripJqueryUiPath ).map( file ) );

	this.jqueryCore = files( glob( jqueryUi.path + "jquery-*" ).map( stripJqueryUiPath ).map( file ) );

	// Auxiliary variables
	this.demoSubdirs = glob( jqueryUi.path + "demos/*" ).filter( isDirectory ).map(function( filepath ) {
		// Get basename only with no trailing slash
		return path.basename( filepath ).replace( /\/$/, "" );
	}).sort();
}

JqueryUiFiles.prototype = {
	get: function( filepath ) {
		return this.cache[ filepath ];
	},

	min: function( file ) {
		var minified = this.cache.minified;

		if ( !minified[ file.path ] ) {
			minified[ file.path ] = {
				path: file.path.replace( /\.([^.]*)$/, ".min.$1" )
			};
			if ( (/.js$/i).test( file.path ) ) {
				minified[ file.path ].data = UglifyJS.minify( file.data.toString( "utf8" ), { fromString: true } ).code;
			} else if ( (/.css$/i).test( file.path ) ) {
				minified[ file.path ].data = sqwish.minify( file.data.toString( "utf8" ) );
			}
		}

		return minified[ file.path ];
	}
};


/**
 * JqueryUi
 */
function JqueryUi( path, options ) {
	options = options || {};
	this.dependsOn = options.dependsOn;
	this.stable = options.stable;
	this.label = this.stable ? "Stable" : "Legacy";
	// 1: Always with a trailing slash
	this.path = path.replace( /\/*$/, "/" ) /* 1 */;
	this.pkg = JSON.parse( fs.readFileSync( path + "/package.json" ) );
	this.manifests = glob( this.path + "/*.jquery.json" ).map(function( filepath ) {
		return JSON.parse( fs.readFileSync( filepath ) );
	});
}

JqueryUi.all = function() {
	if ( !JqueryUi._all ) {
		JqueryUi._all = config().jqueryUi.map(function( jqueryUi ) {
			// 1: Allow config to override path, used by jQuery UI release process to generate themes.
			var path = ( jqueryUi.path /* 1 */ || __dirname + "/../jquery-ui/" + jqueryUi.ref ) + "/";
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

JqueryUi.files = files;

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
					dependencies: Object.keys( manifest.dependencies ).filter(function( dependency ) {
						return dependency !== "jquery";
					}).map(function( dependency ) {
						return dependency.replace( /ui\./, "" );
					})
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
			this._files = new JqueryUiFiles( this );
		}
		return this._files;
	}
};

module.exports = JqueryUi;
