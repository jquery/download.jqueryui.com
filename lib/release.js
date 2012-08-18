var _ = require( "underscore" ),
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob;

var categories = {
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
	orderedComponents = "core widget mouse position".split( " " );

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


/**
 * Release
 */
function Release( path ) {
	this.path = path;
	this.pkg = JSON.parse( fs.readFileSync( path + "/package.json" ) );
	this.manifests = glob( this.path + "/*.jquery.json" ).map(function( filepath ) {
		return JSON.parse( fs.readFileSync( filepath ) );
	});
}

Release.prototype = {
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
	categories: function() {
		if ( !this._categories ) {
			var arr = [],
				map = {};
			this.components().forEach(function( component ) {
				if ( !map[ component.category ] ) {
					var category = _.extend({
						components: []
					}, categories[component.category]);
					map[ component.category ] = category;
					arr.push( category );
				}
				map[ component.category ].components.push( component );
			});
			this._categories = arr.sort(function( a, b ) {
				return a.order - b.order;
			});
		}
		return this._categories;
	}
};

module.exports =  {
	all: function() {
		return glob( __dirname + "/../release/*" ).map(function( path ) {
			return new Release( path );
		});
	}
};
