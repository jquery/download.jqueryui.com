var cache,
	Cache = require( "./cache" ),
	semver = require( "semver" );

cache = new Cache( "Build Cache" );

/**
 * Builder( jqueryUi, components, options )
 * - jqueryUi [ instanceof JqueryUi ]: jQuery UI object.
 * - components [ Array / String ]: Array with the component names, or a special string ":all:" that selects all the components.
 * - options: details below.
 *
 * options:
 * - scope [ String ]: Insert a scope string on the css selectors.
 */
function Builder( jqueryUi, components, options ) {
	this.jqueryUi = jqueryUi;
	this.components = this.expandComponents( components );
	this.options = options;
}

Builder.prototype = {
	build: function( callback ) {
		var cacheKey = this.jqueryUi.pkg.version + JSON.stringify( this.expandComponents( this.components ) ),
			cached = cache.get( cacheKey );

		if ( cached ) {

			// if we have data, call the callback, otherwise push ours
			if ( cached.data ) {
				callback( null, cached.data );
			} else {
				cached.callbacks.push( callback );
			}
			return true;
		}

		cached = {
			callbacks: [ callback ]
		};
		cache.set( cacheKey, cached );

		function done( err, data ) {
			var callbacks = cached.callbacks;
			if ( !err ) {
				cached.data = data;
				delete cached.callbacks;
			}
			callbacks.forEach(function( callback ) {
				callback( err, data );
			});
			delete cached.callbacks;
			if ( err ) {
				cache.destroy( cacheKey );
			}
		}

		if ( semver.gte( this.jqueryUi.pkg.version, "1.11.0-a" ) ) {
			require( "./builder-1-11" )( this, this.jqueryUi, this.components, this.options, done );
		} else {
			require( "./builder-1-10" )( this, this.jqueryUi, this.components, this.options, done );
		}
	},

	expandComponents: function( components ) {
		var allComponents = this.jqueryUi.components().map(function( element ) {
				return element.name;
			}),
			invalidComponent = function( element ) {
				return allComponents.indexOf( element ) < 0;
			};
		if ( typeof components === "string" && components === ":all:" ) {
			components = allComponents;
		}
		// Validate components
		if ( components.some( invalidComponent ) ) {
			throw new Error( "Builder: invalid components [ \"" + components.filter( invalidComponent ).join( "\", \"" ) + "\" ]" );
		}
		return components;
	},

	get: function( file ) {
		return this.files.get( file );
	}
};

module.exports = Builder;
