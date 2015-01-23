var categories, orderedComponents,
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

orderedComponents = "core widget mouse position".split( " " );

function createCategories( manifests ) {
	var map = {};
	return manifests.reduce(function( arr, manifest ) {
		if ( !map[ manifest.category ] ) {
			var category = _.extend({
				components: []
			}, categories[ manifest.category ] );
			map[ manifest.category ] = category;
			arr.push( category );
		}
		map[ manifest.category ].components.push( manifest );
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
	this.categories = createCategories( this.manifests );
}

module.exports = JqueryUiManifests_1_11_0;
