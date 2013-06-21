var Builder, buildCache, categories, orderedComponents,
	_ = require( "underscore" ),
	Cache = require( "./cache" ),
	config = require( "./config" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	JqueryUiFiles_1_9_0 = require( "./jquery-ui.files.1.9.0.js" ),
	JqueryUiFiles_1_10_0 = require( "./jquery-ui.files.1.10.0.js" ),
	semver = require( "semver" );

buildCache = new Cache( "Build Cache" );

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
			var path = __dirname + "/../jquery-ui/" + jqueryUi.ref + "/";
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
	build: function( components, options ) {
		var cacheKey = this.pkg.version + JSON.stringify( this.expandComponents( components ) );
		if ( !Builder ) {
			Builder = require( "./builder" );
		}
		if ( !buildCache.get( cacheKey ) ) {
			buildCache.set( cacheKey, new Builder( this, components, options ) );
		}
		return buildCache.get( cacheKey );
	},

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

	expandComponents: function( components ) {
		var allComponents = this.components().map(function( element ) {
				return element.name;
			}),
			invalidComponent = function( element ) {
				return allComponents.indexOf( element ) < 0;
			};
		if ( typeof components === "string" && components === ":all:" ) {
			components = allComponents;
		}
		// Validate components
		if ( components.some( invalidComponent ) ) {
			throw new Error( "Builder: invalid components [ \"" + components.filter( invalidComponent ).join( "\", \"" ) + "\" ]" );
		}
		return components;
	},

	files: function() {
		if ( !this._files ) {
			if ( semver.gte( this.pkg.version, "1.10.0" ) ) {
				this._files = new JqueryUiFiles_1_10_0( this );
			} else {
				this._files = new JqueryUiFiles_1_9_0( this );
			}
		}
		return this._files;
	}
};

module.exports = JqueryUi;
