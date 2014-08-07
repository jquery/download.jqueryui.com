var pack, indexTemplate, stripBanner,
	async = require( "async" ),
	banner = require( "./banner" ),
	Files = require( "./files" ),
	fs = require( "fs" ),
	handlebars = require( "handlebars" ),
	path = require( "path" ),
	sqwish = require( "sqwish" ),
	util = require( "./util" );

indexTemplate = handlebars.compile( fs.readFileSync( __dirname + "/../template/zip/index-1-11.html", "utf8" ) );

stripBanner = util.stripBanner;

/**
 * Generates a build array [ <build-item>, ... ], where
 * build-item = {
 *   path: String:package destination filepath,
 *   data: String/Buffer:the content itself
 * }
 */
pack = function( callback ) {
	var build,
		add = function( file ) {
			if ( arguments.length === 2 ) {
				file = {
					path: arguments[ 0 ],
					data: arguments[ 1 ]
				};
			}
			output.push({
				path: path.join( basedir, file.path ),
				data: file.data
			});
		},
		basedir = this.basedir,
		builder = this.builder,
		options = this.options,
		output = [],
		theme = this.theme,
		themeImagesCache = this.themeImagesCache;

	function _build( callback ) {
		builder.build(function( error, _build ) {
			if ( error ) {
				return callback( error );
			}
			build = _build;
			callback();
		});
	}

	function pack( callback ) {
		// Bundle JS
		build.bundleJs.forEach( add );
		build.bundleJsMin.forEach( add );

		// Theme files
		if ( !options.skipTheme ) {
			add( "jquery-ui.structure.css", build.structureCss );
			add( "jquery-ui.structure.min.css", build.structureCssMin );

			if ( !theme.isNull ) {
				add( "jquery-ui.theme.css", theme.css() );
				add( "jquery-ui.theme.min.css", banner( build.pkg, null, { minify: true } ) + sqwish.minify( util.stripBanner({ data: theme.css() }) ) );
			}

			// Bundle CSS
			build.bundleCss( theme ).forEach( add );
			build.bundleCssMin( theme ).forEach( add );
		}

		// Ad hoc
		build.jqueryCore.forEach( add );
		add( "index.html", indexTemplate({
			ui: build.components.reduce(function( sum, component ) {
				sum[ component ] = true;
				return sum;
			}, {}),
			version: build.pkg.version
		}));

		// Theme image files
		if ( theme.isNull ) {
			callback( null, output );
		}
		else {
			async.series([
				function( callback ) {
					var themeImages = Files();
					if ( themeImagesCache[ theme.name ] ) {
						// Cached
						callback( null, themeImages.concat( themeImagesCache[ theme.name ] ) );
					} else {
						// Not cached, fetch them
						theme.generateImages(function( err, imageFiles ) {
							if ( err ) {
								callback( err, null );
								return;
							}
							callback( null, themeImages.concat( imageFiles ) );
						});
					}
				}
			], function( err, themeImages ) {
				if ( err ) {
					callback( err, null );
				}
				themeImages[ 0 ].into( "images/" ).forEach( add );
				callback( null, output );
			});
		}
	}

	async.series([
		_build,
		pack
	], function( error ) {
		callback( error, output );
	});
};


/**
 * Packer( builder, theme, options )
 * - builder [ instanceof Builder ]: jQuery UI builder object.
 * - theme [ instanceof ThemeRoller ]: theme object.
 */
function Packer_1_10( builder, theme ) {
	this.pack = pack;
}

module.exports = Packer_1_10;
