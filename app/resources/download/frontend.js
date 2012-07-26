;(function( $, undefined ) {

	var dependencies = {},
		dependents = {};

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


	/**
	 * Init
	 */
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
	$( ".download-builder h2" ).after( drawToggleAll( "toggleAll" ) );
	$( ".download-builder h3" ).after( drawToggleAll( "toggle" ) );


	/**
	 * Bind
	 */
	$( ".download-builder input[type=checkbox]" ).click(function( event ) {
		var target = $( event.target );
		if ( target.parent().is( ".toggle" ) ) {
			check( $( this ).closest( "fieldset" ).find( "input[type=checkbox]" ), $( this ).prop( "checked" ) );
		} else if ( target.parent().is( ".toggleAll" ) ) {
			check( $( this ).closest( "form" ).find( "input[type=checkbox]" ).not( this ), $( this ).prop( "checked" ) );
		} else {
			check( $( this ), $( this ).prop( "checked" ) );
		}
	});

}( jQuery ));
