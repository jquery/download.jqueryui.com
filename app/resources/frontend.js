;
(function( $, undefined ) {

	var checkboxes,
		dependencies = {},
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


	/**
	 * Init
	 */
	checkboxes = $( ".download-builder input[type=checkbox]" );
	checkboxes.each(function() {
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


	/**
	 * Bind
	 */
	checkboxes.click(function( event ) {
		var target = $( event.target );
		if ( target.parent().is( ".toggle" ) ) {
			check( $( this ).parent().nextUntil( ".toggle" ).find( "input[type=checkbox]" ), $( this ).prop( "checked" ) );
		} else if ( target.parent().is( ".toggleAll" ) ) {
			check( $( this ).closest( "form" ).find( "input[type=checkbox]" ).not( this ), $( this ).prop( "checked" ) );
		} else {
			check( $( this ), $( this ).prop( "checked" ) );
		}
	});

})( jQuery );
