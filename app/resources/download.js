/*jshint jquery: true, browser: true */
;(function( $, undefined ) {

	// rewrite form action for testing on staging
	if ( /^stage\./.test( location.host ) ) {
		$( ".download-builder form" ).attr( "action", function(index, href) {
			return href.replace(/(download\.)/, "stage.$1");
		});
	}

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

	// FIXME: duplicate from themeroller.js
	function hashClean(locStr){
		return locStr.replace(/%23/g, "").replace(/[\?#]+/g, "");
	}

	function currSearch() {
		return hashClean(window.location.search);
	}
	
	function themeFetch( success, error ) {
		$.ajax( downloadJqueryuiHost + '/download/theme?themeParams=' + escape( currSearch() ), {
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
			check( $( this ).closest( "fieldset" ).find( "input[type=checkbox]" ), $( this ).prop( "checked" ) );
		} else if ( target.parent().is( ".toggleAll" ) ) {
			check( $( this ).closest( "form" ).find( "input[type=checkbox]" ).not( this ), $( this ).prop( "checked" ) );
		} else {
			check( $( this ), $( this ).prop( "checked" ) );
		}
	});

	// Loads theme section.
	themeFetch(function( themeSection ) {
		$( ".download-builder .components" ).after( themeSection );
	}, function( jqXHR, textStatus, errorThrown ) {
		console.log( "Failed loading theme section", textStatus, errorThrown );
	});

}( jQuery ));
