var version = "jquery-ui-1.9.0pre",
	dir = "versions/" + version,
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob;

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
		});
	},
	categories: function() {
		var result = [],
			categories = {};
		module.exports.components().forEach(function( component ) {
			if ( !categories[ component.category ] ) {
				var category = {
					name: component.category,
					components: []
				};
				categories[ component.category ] = category;
				result.push( category );
			}
			categories[ component.category ].components.push( component );
		});

		result.sort(function( a, b ) {
			return a.name > b.name ? 1 : -1;
		});

		return result;
	}

};

// console.log(module.exports.components());