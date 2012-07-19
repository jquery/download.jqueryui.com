var version = "jquery-ui-1.9.0pre",
	coreRegex = /core|widget|mouse|position/,
	dir = "versions/" + version,
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob,
	_ = require( "underscore" ),
	dict = {
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

function dependencies( manifest ) {
	var result = [];
	for ( var component in manifest.dependencies ) {
		if ( component != "jquery" ) {
			result.push( component.replace( /ui\./, "" ) );
		}
	}
	return result;
}
module.exports = {
	components: function() {
		return glob( dir + "/*.jquery.json" ).map(function( file ) {
			var manifest = JSON.parse( fs.readFileSync( file ) );
			return {
				name: manifest.name.replace( /ui\./, "" ),
				title: manifest.title.replace( /^jQuery UI /, ""),
				description: manifest.description,
				category: manifest.category,
				dependencies: dependencies( manifest )
			};
		// TODO stupid approach to getting those four components to the top
		// improve...
		}).sort(function( a, b ) {
			if ( coreRegex.test( a.name ) ) {
				return -1;
			}
			if ( coreRegex.test( b.name )) {
				return 1;
			}
			return  a.name > b.name ? 1 : -1;
		});
	},
	categories: function() {
		var result = [],
			categories = {};
		module.exports.components().forEach(function( component ) {
			if ( !categories[ component.category ] ) {
				var category = _.extend({
					components: []
				}, dict[component.category]);
				categories[ component.category ] = category;
				result.push( category );
			}
			categories[ component.category ].components.push( component );
		});

		result.sort(function( a, b ) {
			return a.order - b.order;
		});

		return result;
	}

};

// console.log(module.exports.components());
