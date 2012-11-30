var commonFiles, componentFiles,
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
	"themes/base/images/*",
	"themes/base/minified/jquery.ui.theme.min.css",
	"themes/base/minified/images/*"
];
componentFiles = [
	"*jquery.json",
	"ui/**",
	"themes/base/jquery*",
	"themes/base/minified/jquery*"
];

/**
 * ReleaseFiles
 */
function ReleaseFiles( releasePath ) {
	var cacheIt = function( filepath ) {
			filesCache[ releasePath ][ filepath ] = fs.readFileSync( releasePath + filepath );
		},
		globedReleasePath = glob( releasePath + "." )[ 0 ],
		stripReleasePath = function( filepath ) {
			// Glob returns relative paths, so we use globedReleasePath instead of the absolute releasePath
			return filepath.replace( globedReleasePath, "" );
		};

	this.data = filesCache[ releasePath ] = {};

	this.commonFiles = commonFiles.map(function( path ) {
		return glob( releasePath + path ).filter( noDirectory ).map( stripReleasePath ).filter(function( filepath ) {
			return ! (/^MANIFEST$|\.jquery\.json$/).test( filepath );
		});
	}).reduce( flatten, [] );

	this.componentFiles = componentFiles.map(function( path ) {
		return glob( releasePath + path ).filter( noDirectory ).map( stripReleasePath );
	}).reduce( flatten, [] );

	this.demoFiles = glob( releasePath + "demos/*/**" ).filter( noDirectory ).map( stripReleasePath );

	this.docFiles = glob( releasePath + "docs/*" ).map( stripReleasePath );

	// Cache them
	this.commonFiles.forEach( cacheIt );
	this.componentFiles.forEach( cacheIt );
	this.demoFiles.forEach( cacheIt );
	this.docFiles.forEach( cacheIt );

	// Auxiliary variables
	this.jqueryFilename = stripReleasePath( glob( releasePath + "jquery-*" )[ 0 ] );
	this.themeFiles = glob( releasePath + "themes/base/**" ).map( stripReleasePath );
}

ReleaseFiles.prototype = {
};


/**
 * Release
 */
function Release( path, opts ) {
	this.label = opts.label;
	this.stable = opts.stable;
	this.path = path;
	this.pkg = JSON.parse( fs.readFileSync( path + "/package.json" ) );
	this.manifests = glob( this.path + "/*.jquery.json" ).map(function( filepath ) {
		return JSON.parse( fs.readFileSync( filepath ) );
	});
}

Release.all = function() {
	if ( !Release._all ) {
		if ( !fs.existsSync( __dirname + "/../release" ) ) {
			throw new Error( "Missing ./release folder. Run `grunt prepare` first." );
		}
		Release._all = config.jqueryUi.map(function( jqueryUi ) {
			var path = __dirname + "/../release/" + jqueryUi.ref + "/";
			if ( !fs.existsSync( path ) ) {
				throw new Error( "Missing ./release/" + jqueryUi.ref + " folder. Run `grunt prepare` first." );
			}
			if ( !fs.existsSync( path + "package.json" ) ) {
				throw new Error( "Invalid ./release/" + jqueryUi.ref + " folder. Run `grunt prepare` first." );
			}
			return new Release( path, jqueryUi );
		});
	}
	return Release._all;
};

Release.getStable = function() {
	return Release.all()[ 0 ];
};

Release.find = function( version ) {
	return Release.all().filter(function( release ) {
		return release.pkg.version === version;
	})[ 0 ];
};

Release.prototype = {
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
			this._files = new ReleaseFiles( this.path );
		}
		return this._files;
	}
};

module.exports = Release;
