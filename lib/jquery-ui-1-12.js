"use strict";

var categories, orderedComponents,
	_ = require( "underscore" ),
	fs = require( "fs" ),
	path = require( "path" );

categories = {
	"Core": {
		name: "Core",
		description: "Various utilities and helpers",
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

orderedComponents = "core widget mouse position".split( " " );

function createCategories( manifests ) {
	var map = {};
	return manifests.reduce( function( arr, component ) {
		if ( !map[ component.category ] ) {
			var category = _.extend( {
				components: []
			}, categories[ component.category ] );
			map[ component.category ] = category;
			arr.push( category );
		}
		map[ component.category ].components.push( component );
		return arr;
	}, [] ).sort( function( a, b ) {
		return a.order - b.order;
	} );
}

function stripExtension( string ) {
	return string.replace( /\.[^.]*/, "" );
}

function flattenDependencies( tree, dependencies, ret ) {
	ret = ret || [];
	dependencies.filter( function( dependency ) {
		return dependency !== "jquery";
	} ).forEach( function( dependency ) {
		if ( ret.indexOf( dependency ) === -1 ) {
			ret.push( dependency );
			flattenDependencies( tree, tree[ dependency ] || [], ret );
		}
	} );
	return ret;
}

function get( data, key ) {
	var match = data.match( new RegExp( "\/\/>>" + key + ": (.*)" ) );
	return match && match[ 1 ];
}

function trim( string ) {
	return string.trim();
}

function getDependencies( data ) {
	var match = data.match( /define\(\ ?\[([^\]]*?)\]/ );
	if ( match === null ) {
		return [];
	}
	return match[ 1 ].replace( /\/\/.+/g, "" ).replace( /"/g, "" ).split( "," ).map( trim );
}

function JqueryUiManifests_1_12_0() {
	var dependenciesTree = {};
	this.manifests = this.files().componentFiles.filter( function( component ) {
		return ( /ui\// ).test( component.path );
	} ).map( function( component ) {
		var data = component.data;
		return {
			name: stripExtension( path.relative( "ui", component.path ) ),
			title: get( data, "label" ),
			description: get( data, "description" ),
			docs: get( data, "docs" ),
			category: get( data, "group" ),
			dependencies: getDependencies( data ).map( function( dependency ) {
				return path.relative( ".", dependency );
			} )
		};

	// Workaround to get rid of files like `form-reset-mixin.js`.
	} ).filter( function( component ) {
		return component.title !== null;

	} ).sort( function( a, b ) {
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
	} );
	this.manifests.forEach( function( manifest ) {
		dependenciesTree[ manifest.name ] = manifest.dependencies;
	} );
	this.manifests.forEach( function( manifest ) {
		manifest.dependencies = flattenDependencies( dependenciesTree, manifest.dependencies );
	} );
	this.categories = createCategories( this.manifests );
}

module.exports = JqueryUiManifests_1_12_0;
