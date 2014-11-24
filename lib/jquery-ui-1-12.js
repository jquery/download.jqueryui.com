var categories,
	_ = require( "underscore" ),
	fs = require( "fs" ),
	glob = require( "./util" ).glob,
	path = require( "path" );

categories = {
	"UI Core": {
		name: "UI Core",
		description: "A required dependency, contains basic functions and initializers.",
		order: 0
	},
	"Interactions": {
		name: "Interactions",
		description: "These add basic behaviors to any element and are used by many components below.",
		order: 1
	},
	"Widgets": {
		name: "Widgets",
		description: "Full-featured UI Controls - each has a range of options and is fully themeable.",
		order: 2
	},
	"Effects": {
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

function stripExtension( string ) {
	return string.replace( /\.[^.]*/, "" );
}

function flattenDependencies( tree, dependencies, ret ) {
	ret = ret || [];
	dependencies.filter(function( dependency ) {
		return dependency !== "jquery";
	}).forEach(function( dependency ) {
		if ( ret.indexOf( dependency ) === -1 ) {
			ret.push( dependency );
			flattenDependencies( tree, tree[ dependency ] || [], ret );
		}
	});
	return ret;
}

function get( data, key ) {
	var match = data.match( new RegExp( "\/\/>>" + key + ": (.*)" ) );
	return match && match[ 1 ];
}

function getDependencies( data ) {
	var match = data.match( /define\((\[[\s\S]*?\]), factory \);/ );
	return match && JSON.parse( match[ 1 ] ) || [];
}

function JqueryUiManifests_1_12_0() {
	var dependenciesTree = {};
	this.manifests = this.files().componentFiles.filter(function( component ) {
		return ( /ui\// ).test( component.path );
	}).map(function( component ) {
		var data = component.data;
		return {
			name: stripExtension( path.relative( "ui", component.path ) ),
			title: get( data, "label" ),
			description: get( data, "description" ),
			docs: get( data, "docs" ),
			category: get( data, "group" ),
			dependencies: getDependencies( data ).map(function( dependency ) {
				return path.relative( ".", dependency );
			})
		};
	});
	this.manifests.forEach(function( manifest ) {
		dependenciesTree[ manifest.name ] = manifest.dependencies;
	});
	this.manifests.forEach(function( manifest ) {
		manifest.dependencies = flattenDependencies( dependenciesTree, manifest.dependencies );
	});
	this.categories = createCategories( this.manifests );
}

module.exports = JqueryUiManifests_1_12_0;
