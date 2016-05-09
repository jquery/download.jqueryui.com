var async = require( "async" );
var extend = require( "util" )._extend;
var banner = require( "./banner" );
var sqwish = require( "sqwish" );
var Package1_12 = require( "./package-1-12" );
var path = require( "path" );
var ThemeGallery = require( "./themeroller-themegallery" );

function stripBanner( data ) {
	if ( data instanceof Buffer ) {
		data = data.toString( "utf8" );
	}
	return data.replace( /^\s*\/\*[\s\S]*?\*\/\s*/g, "" );
}

function Package( files, runtime ) {
	this.themeGallery = ThemeGallery( runtime.jqueryUi );
	if ( !runtime.themeVars ) {
		runtime.themeVars = this.themeGallery[ 0 ].vars;
	}
	Package1_12.apply( this, arguments );
}

// Copy some properties from the Package1_12's prototype
[
	"AUTHORS.txt",
	"LICENSE.txt",
	"images"
].concat(
	Object.keys(Package1_12.prototype)
		.filter( function( property ) {
			return /\.css$/.test( property );
		} )
).forEach( function( prop ) {
	Package.prototype[ prop ] = Package1_12.prototype[ prop ];
});

extend( Package.prototype, {
	"themes": function( callback ) {
		var files = {};
		var structureCssFileNames = this.structureCssFileNames;
		var themeCssFileNames = this.themeCssFileNames;
		var pkgJson = this.pkgJson;
		var themeGallery = this.themeGallery;
		this.structureCss.promise.then( function( structureCss ) {
			async.mapSeries( themeGallery, function( theme, callback ) {
				var themeCss = theme.css();

				files[path.join(theme.folderName(), "theme.css")] = themeCss;

				var _banner = banner( pkgJson, structureCssFileNames.concat( themeCssFileNames ), {
					customThemeUrl: theme.url()
				});
				var _minBanner = banner( pkgJson, structureCssFileNames.concat( themeCssFileNames ), {
					minify: true,
					customThemeUrl: theme.url()
				} );
				var allCss = structureCss + stripBanner( themeCss );

				// Bundle CSS (and minified)
				files[path.join(theme.folderName(), "jquery-ui.css")] = _banner + allCss;
				files[path.join(theme.folderName(), "jquery-ui.min.css")] = _minBanner + sqwish.minify( allCss );

				// Custom theme image files
				theme.generateImages(function( error, imageFiles ) {
					if ( error ) {
						return callback( error, null );
					}
					imageFiles.forEach(function(imageFile) {
						files[ path.join(theme.folderName(), "images", imageFile.path ) ] = imageFile.data;
					});
					callback();
				});
			}, function( error ) {
				if ( error ) {
					console.log( 'mapSeries( themeGallery ) failed', error );
					return callback( error );
				}
				callback( null, files );
			});
		} );
	}
});

module.exports = Package;
