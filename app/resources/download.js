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

	function _check( elem, value ) {
		elem.each(function() {
			var elem = $( this ),
				name = elem.attr( "name" );

			// Handle dependencies
			if ( name ) {
				if ( value ) {
					if ( dependencies[ name ] ) {
						// Whenever a checkbox is activated, also activate all dependencies
						_check( dependencies[ name ], value );
					}
				} else if ( dependents[ name ] ) {
					// Whenever a checkbox is deactivated, also deactivate all dependents
					_check( dependents[ name ], value );
				}
			}

			elem.prop( "checked", value );

			// Update toggle all
			if ( name ) {
				// When checking a component up
				if ( value ) {
					// Set group toggle all if all components of its group are checked
					if ( !allGroup( elem ).filter( ":not(:checked)" ).length ) {
						$( elem ).closest( "fieldset" ).find( ".toggle input[type=checkbox]" ).prop( "checked", true );
					}
					// Set toggle all if all components are checked
					if ( !allComponents( elem ).filter( ":not(:checked)" ).length ) {
						$( elem ).closest( "form" ).find( ".toggleAll input[type=checkbox]" ).prop( "checked", true );
					}
				} else {
					// Unset group toggle all if no components of its group are checked
					if ( !allGroup( elem ).filter( ":checked" ).length ) {
						$( elem ).closest( "fieldset" ).find( ".toggle input[type=checkbox]" ).prop( "checked", false );
					}
					// Unset toggle all if no components are checked
					if ( !allComponents( elem ).filter( ":checked" ).length ) {
						$( elem ).closest( "form" ).find( ".toggleAll input[type=checkbox]" ).prop( "checked", false);
					}
				}
			}
		});
	}

	function check( elem, value ) {
		elem.each(function() {
			var dependentsCount,
				elem = $( this ),
				name = elem.attr( "name" );

			// Validate if uncheck is allowed when it has dependents
			if ( name && !value && dependents[ name ] && ( dependentsCount = dependents[ name ].filter( ":checked" ).length ) > 0 ) {
				elem.prop( "checked", !value );
				$( "<div>" )
					.attr( "title", "Remove " + name + "?" )
					.append(
						$( "<p>" ).html(
							"Are you sure you want to remove <b>" + name + "</b>? The following " + pluralize( dependentsCount, "component", "components" ) + " " + pluralize( dependentsCount, "depends", "depend" ) + " on it and will be removed: " + dependents[ name ].filter( ":checked" ).map(function() {
								return "<b>" + this.name + "</b>";
							}).toArray().join( ", " ) + "."
						)
					)
					.dialog({
						modal: true,
						buttons: {
							"Remove": function() {
								_check( elem, value );
								$( this ).remove();
							},
							"Cancel": function() {
								$( this ).remove();
							}
						}
					})
					.dialog( "widget" ).addClass( "download-builder-dialog" );
			} else {
				_check( elem, value );
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

	function pluralize( count, singular, plural ) {
		return count == 1 ? singular : plural;
	}

	function hashClean(locStr){
		return locStr.replace(/%23/g, "").replace(/[\?#]+/g, "");
	}

	function currSearch() {
		return hashClean( window.location.search );
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
			var selected = $( this ).find( "option:selected" ),
				folderName = selected.text().toLowerCase().replace( " ", "-" ),
				val = selected.val();
			$( this ).closest( ".download-builder-header" ).find( "a.themeroller-link" ).attr( "href", "/themeroller" + ( val ? "#" + val : "" ) );
			$( "#theme-folder-name" ).val( folderName );
		});

		$( ".field-help-content" ).hide();
		$( ".field-help-link" ).each(function() {
			var thisDialog = $( $( this ).attr( "href" ) ).dialog({
				autoOpen: false,
				title: $( this ).parent().text(),
				modal: true
			});
			thisDialog.dialog( "widget" ).addClass( "download-builder-dialog" );
			$( this ).click(function() {
				thisDialog.dialog( "open" );
				return false;
			});
		});

		$( "#scope" ).keyup(function() {
			if ( !$( "#theme-folder-name" ).data( "edited" ) ) {
				$( "#theme-folder-name" ).data( "suggestedEdit", true );
				$( "#theme-folder-name" ).val( escape( $( this ).val().split( " " ).join( "-" ).toLowerCase().replace( ".", "" ).replace( "#", "" ) ) );
			}
		});	
		
		$( "#theme-folder-name" ).keyup(function() {
			$( this ).data( "edited", true );
			$( "#theme-folder-name" ).removeData( "suggestedEdit" );
			$( this ).val( escape( $( this ).val().replace( " ", "-" ).split( " ").join( "-" ).toLowerCase().replace( ".", "" ).replace( "#", "" ) ) );
		});

		$( "#theme-folder-name" ).blur(function() {
			if ( $( this ).val() == "" ) {
				$( "#theme-folder-name" ).removeData( "edited" );
			}
		});
	}, function( jqXHR, textStatus, errorThrown ) {
		console.log( "Failed loading theme section", textStatus, errorThrown );
	});

}( jQuery ));
