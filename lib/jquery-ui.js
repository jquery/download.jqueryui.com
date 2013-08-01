var Builder, categories, orderedComponents,
	_ = require( "underscore" ),
	config = require( "./config" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	JqueryUiFiles = require( "./jquery-ui.files.js" );

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
	var match = JqueryUi.all().filter(function( jqueryUi ) {
		return jqueryUi.stable;
	});
	if ( !match.length ) {
		throw new Error( "No stable jqueryUi has been defined. Check your config file." );
	}
	return match[ 0 ];
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
					docs: manifest.docs,
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
