var version = "jquery-ui-1.9.0pre",
	dir = "versions/" + version,
	fs = require( "fs" ),
	glob = require( "glob-whatev" ).glob;

function category( manifest ) {
	if ( /ui.(core|widget|mouse|position)/.test( manifest.name ) ) {
		return "core";
	}
	return manifest.keywords.indexOf( "effect" ) != -1 ? "effect" : "widget";
}
function dependencies( manifest ) {
	var result = [];
	for ( var component in manifest.dependencies ) {
		if ( component != "jquery" ) {
			result.push( component.replace( /ui\./, "" ) );
		}
	}
	return result;
}
module.exports = glob( dir + "/*.jquery.json" ).map(function( file ) {
	var manifest = JSON.parse( fs.readFileSync( file ) );
	return {
		name: manifest.name.replace( /ui\./, "" ),
		title: manifest.title.replace( /^jQuery UI /, ""),
		description: manifest.description,
		category: category( manifest ),
		dependencies: dependencies( manifest )
	};
});

// console.log(module.exports);