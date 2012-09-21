/*jshint jquery: true, browser: true */
;(function( $, undefined ) {

	var dependencies = {},
		dependents = {},
		downloadJqueryuiHost = $( ".download-builder" ).first().data( "download-jqueryui-host" );

	// rewrite form action for testing on staging
	if ( /^stage\./.test( location.host ) ) {
		$( ".download-builder form" ).attr( "action", function( index, href ) {
			return href.replace( /(download\.)/, "stage.$1" );
		});
		downloadJqueryuiHost = downloadJqueryuiHost.replace( /(download\.)/, "stage.$1" );
	}

	function allComponents( referenceElement ) {
		return $( referenceElement ).closest( "form" ).find( ".component-group-list input[type=checkbox]" );
	}

	function allGroup( referenceElement ) {
		return $( referenceElement ).closest( "fieldset" ).find( ".component-group-list input[type=checkbox]" );
	}

	function check( elem, value ) {
		elem.each(function() {
			var elem = $( this ),
				name = elem.attr( "name" );

			// Handle dependencies
			if ( name ) {
				// Whenever a checkbox is activated, also activate all parent dependencies
				if ( value ) {
					if ( dependencies[ name ] ) {
						check( dependencies[ name ], value );
					}
				} else if ( dependents[ name ] ) {
					// Whenever a checkbox is deactivated, also deactivate all child dependencies
					check( dependents[ name ], value );
				}
			}

			elem.prop( "checked", value );

			// Update toggle all
			if ( name ) {
				// When checking a component up
				if ( value ) {
					// Set group toggle all if all components of its group are checked
					if ( allGroup( elem ).toArray().reduce(function( r, component ) {
						return r && $( component ).prop( "checked" );
					}, true ) ) {
						$( elem ).closest( "fieldset" ).find( ".toggle input[type=checkbox]" ).prop( "checked", true );
					}
					// Set toggle all if all components are checked
					if ( allComponents( elem ).toArray().reduce(function( r, component ) {
						return r && $( component ).prop( "checked" );
					}, true ) ) {
						$( elem ).closest( "form" ).find( ".toggleAll input[type=checkbox]" ).prop( "checked", true );
					}
				} else {
					// Unset group toggle all if no components of its group are checked
					if ( !allGroup( elem ).toArray().reduce(function( r, component ) {
						return ( r || $( component ).prop( "checked" ) );
					}, false ) ) {
						$( elem ).closest( "fieldset" ).find( ".toggle input[type=checkbox]" ).prop( "checked", false );
					}
					// Unset toggle all if no components are checked
					if ( !allComponents( elem ).toArray().reduce(function( r, component ) {
						return ( r || $( component ).prop( "checked" ) );
					}, false ) ) {
						$( elem ).closest( "form" ).find( ".toggleAll input[type=checkbox]" ).prop( "checked", false);
					}
				}
			}
		});
	}

	function drawToggleAll( className ) {
		return $( "<label>" )
			.addClass( className )
			.text( " Toggle All" )
			.prepend(
				$( "<input type=checkbox>" )
					.prop( "checked", true )
					.addClass( "ui-widget-content" )
			);
	}

	// FIXME: duplicated from themeroller.js
	function hashClean(locStr){
		return locStr.replace(/%23/g, "").replace(/[\?#]+/g, "");
	}

	function currSearch() {
		return hashClean(window.location.search);
	}

	function themeFetch( success, error ) {
		$.ajax( downloadJqueryuiHost + "/download/theme" + ( currSearch() ? "?" + currSearch() : "" ), {
			dataType: "jsonp",
			success: function( response ) {
				success( response );
			},
			error: error
		});
	}

	// Initializes dependencies and dependents auxiliary variables.
	$( ".download-builder input[type=checkbox]" ).each(function() {
		var checkbox = $( this ),
			thisDependencies = checkbox.data( "dependencies" ),
			thisName = checkbox.attr( "name" );

		if ( !thisName || !thisDependencies ) {
			return;
		}
		thisDependencies = thisDependencies.split( "," );
		dependencies[ thisName ] = $();
		$.each( thisDependencies, function() {
			var dependecy = this,
				dependecyElem = $( "[name=" + this + "]" );
			dependencies[ thisName ] = dependencies[ thisName ].add( dependecyElem );
			if ( !dependents[ dependecy ] ) {
				dependents[ dependecy ] = $();
			}
			dependents[ dependecy ] = dependents[ dependecy ].add( checkbox );
		});
	});

	// Generating toggle all checkboxes
	$( ".download-builder .components h2" ).after( drawToggleAll( "toggleAll" ) );
	$( ".download-builder .components h3" ).after( drawToggleAll( "toggle" ) );

	// binds click handlers on checkboxes
	$( ".download-builder input[type=checkbox]" ).click(function( event ) {
		var target = $( event.target );
		if ( target.parent().is( ".toggle" ) ) {
			check( allGroup( this ), $( this ).prop( "checked" ) );
		} else if ( target.parent().is( ".toggleAll" ) ) {
			check( allComponents( this ).not( this ), $( this ).prop( "checked" ) );
		} else {
			check( $( this ), $( this ).prop( "checked" ) );
		}
	});

	// Loads theme section.
	themeFetch(function( themeSection ) {
		$( ".download-builder .components" ).after( themeSection );
		$( "#theme" ).on( "click change", function() {
			var folderName = $( this ).find( "option:selected" ).text().toLowerCase().replace(" ", "-");
			$( "#themeFolderName" ).val( folderName );
		});
	}, function( jqXHR, textStatus, errorThrown ) {
		console.log( "Failed loading theme section", textStatus, errorThrown );
	});

}( jQuery ));



// Fix old browsers

// ES5 15.4.4.21
// http://es5.github.com/#x15.4.4.21
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduce
if (!Array.prototype.reduce) {
	Array.prototype.reduce = function reduce(fun /*, initial*/) {
		var self = toObject(this),
			length = self.length >>> 0;

		// If no callback function or if callback is not a callable function
		if (toString(fun) != "[object Function]") {
			throw new TypeError(); // TODO message
		}

		// no value to return if no initial value and an empty array
		if (!length && arguments.length == 1)
			throw new TypeError(); // TODO message

		var i = 0;
		var result;
		if (arguments.length >= 2) {
			result = arguments[1];
		} else {
			do {
				if (i in self) {
					result = self[i++];
					break;
				}

				// if array contains no values, no initial value to return
				if (++i >= length)
					throw new TypeError(); // TODO message
			} while (true);
		}

		for (; i < length; i++) {
			if (i in self)
				result = fun.call(void 0, result, self[i], i, self);
		}

		return result;
	};
}

