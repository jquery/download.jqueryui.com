var categories,
	_ = require( "underscore" ),
	fs = require( "fs" ),
	glob = require( "./util" ).glob;

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

function createCategories( manifests ) {
	var map = {};
	return manifests.reduce(function( arr, component ) {
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

function JqueryUiManifests_1_11_0() {
	this.manifests = glob( this.path + "/*.jquery.json" ).map(function( filepath ) {
		return JSON.parse( fs.readFileSync( filepath ) );
	}).map(function( manifest ) {
		manifest.name = manifest.name.replace( /ui\./, "" );
		manifest.title = manifest.title.replace( /^jQuery UI /, "" );
		manifest.dependencies = Object.keys( manifest.dependencies ).filter(function( dependency ) {
			return dependency !== "jquery";
		}).map(function( dependency ) {
			return dependency.replace( /ui\./, "" );
		});
		return manifest;
	});
	this.categories = createCategories( this.manifests );
}

module.exports = JqueryUiManifests_1_11_0;
