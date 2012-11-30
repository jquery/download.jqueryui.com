/*jshint jquery: true, browser: true */
/*global _: false, escape: false, Hash: false, QueryString: false, unescape: false */
/*!
 * jQuery UI Download Builder client-side JavaScript file
 * http://jqueryui.com/download/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( _, $, Hash, QueryString, undefined ) {

	var dependencies, dependents,
		downloadBuilder = $( "#download-builder" ),
		downloadJqueryuiHost = downloadBuilder.data( "download-jqueryui-host" ),
		baseVars = downloadBuilder.data( "base-vars" ),
		model = {};

	// Rewrite form action for testing on staging
	if ( /^stage\./.test( location.host ) ) {
		$( "#download-builder form" ).attr( "action", function( index, href ) {
			return href.replace( /(download\.)/, "stage.$1" );
		});
		downloadJqueryuiHost = downloadJqueryuiHost.replace( /(download\.)/, "stage.$1" );
	}

	function setModel( attributes ) {
		_.extend( model, attributes );

		if ( attributes.folderName ) {
			$( "#theme-folder-name" ).val( model.folderName );
		}
		
		if ( attributes.version ) {
			$( "#download-builder [name=version][value=\"" + model.version + "\"]" ).trigger( "click" );
		}

		if ( attributes.themeParams || attributes.version ) {
			$( "#download-builder .download-builder-header a.themeroller-link" ).attr( "href", themerollerUrl() );
		}

		updateHash();
	}

	function themeUrl() {
		return downloadJqueryuiHost + "/download/theme" + ( model.themeParams !== "none" ? "/?" + QueryString.encode( model ) : "" );
	}

	function themerollerUrl() {
		var themeParams = ( model.themeParams && model.themeParams !== "none" ? QueryString.parse( unescape ( model.themeParams ) ) : {} ),
			querystring = QueryString.encode( _.extend( themeParams, _.pick( model, "version" ) ) );
		return "/themeroller/#" + querystring;
	}

	function allComponents() {
		return $( "#download-builder .component-group-list input[type=checkbox]" );
	}

	function allGroup( referenceElement ) {
		return $( referenceElement ).closest( ".component-group" ).find( ".component-group-list input[type=checkbox]" );
	}

	function _check( elem, value ) {
		elem.each(function() {
			var elem = $( this ),
				name = elem.attr( "name" );

			// Handle dependencies
			if ( value ) {
				if ( dependencies[ name ] ) {
					// Whenever a checkbox is activated, also activate all dependencies
					_check( dependencies[ name ], value );
				}
			} else if ( dependents[ name ] ) {
				// Whenever a checkbox is deactivated, also deactivate all dependents
				_check( dependents[ name ], value );
			}

			elem.prop( "checked", value );

			// Update toggle all
			if ( value ) {
				// Set group toggle all if all components of its group are checked
				if ( !allGroup( elem ).filter( ":not(:checked)" ).length ) {
					$( elem ).closest( ".component-group" ).find( ".toggle input[type=checkbox]" ).prop( "checked", true );
				}
				// Set toggle all if all components are checked
				if ( !allComponents().filter( ":not(:checked)" ).length ) {
					$( elem ).closest( ".components" ).prev().find( ".toggleAll input[type=checkbox]" ).prop( "checked", true );
				}
			} else {
				// Unset group toggle all if no components of its group are checked
				if ( !allGroup( elem ).filter( ":checked" ).length ) {
					$( elem ).closest( ".component-group" ).find( ".toggle input[type=checkbox]" ).prop( "checked", false );
				}
				// Unset toggle all if no components are checked
				if ( !allComponents().filter( ":checked" ).length ) {
					$( elem ).closest( ".components" ).prev().find( ".toggleAll input[type=checkbox]" ).prop( "checked", false);
				}
			}
		});
		downloadOnOff();
	}

	function componentsFetch() {
		return $.ajax( downloadJqueryuiHost + "/download/components/", {
			dataType: "jsonp",
			data: {
				version: model.version
			}
		});
	}

	function check( event, elem, value ) {
		var consolidatedDependents, consolidatedNames;

		// Uncheck validations
		if ( !value ) {
			consolidatedDependents = $();
			consolidatedNames = [];
			elem.each(function() {
				var name = $( this ).attr( "name" );
				if ( dependents[ name ] && dependents[ name ].filter( ":checked" ).not( elem ).length > 0 ) {
					consolidatedNames.push( name );
					consolidatedDependents = consolidatedDependents.add( dependents[ name ].filter( ":checked" ).not( elem ) );
				}
			});

			// Validate if uncheck is allowed when it has dependents
			if ( consolidatedDependents.length > 0 ) {
				event.preventDefault();
				$( "<div>" )
					.attr( "title", "Remove " + consolidatedNames.join( ", " ) + "?" )
					.append(
						$( "<p>" ).html(
							"Are you sure you want to remove <b>" + consolidatedNames.join( ", " ) + "</b>? The following " + pluralize( consolidatedDependents.length, "component", "components" ) + " " + pluralize( consolidatedDependents.length, "depends", "depend" ) + " on it and will be removed: " + consolidatedDependents.map(function() {
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

		// Check validations (none)
		} else {
			_check( elem, value );
		}
	}

	function downloadOnOff() {
		if ( !allComponents().filter( ":checked" ).length && $( "#theme" ).val() === "none" ) {
			$( "#download-builder input[type=submit]" ).prop( "disabled", true ).addClass( "ui-state-disabled" );
		} else {
			$( "#download-builder input[type=submit]" ).prop( "disabled", false ).removeClass( "ui-state-disabled" );
		}
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

  function loadComponents() {
		var versionElement = $( "#download-builder [name=version]:checked" );
		setModel({ version: versionElement.val() });
		componentsFetch().done(function( componentsSection ) {
			dependencies = {};
			dependents = {};

			$( "#download-builder .components-area").html( componentsSection );

			// Initializes dependencies and dependents auxiliary variables.
			$( "#download-builder input[type=checkbox]" ).each(function() {
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
			$( "#download-builder .components" ).prev().find( "h2" ).after( drawToggleAll( "toggleAll" ) );
			$( "#download-builder .component-group h3" ).after( drawToggleAll( "toggle" ) );

			// Binds click handlers on components checkboxes
			$( "#download-builder .components-area input[type=checkbox]" ).on( "click", function( event ) {
				var target = $( event.target );
				if ( target.parent().is( ".toggle" ) ) {
					check( event, allGroup( this ), $( this ).prop( "checked" ) );
				} else if ( target.parent().is( ".toggleAll" ) ) {
					check( event, allComponents(), $( this ).prop( "checked" ) );
				} else {
					check( event, $( this ), $( this ).prop( "checked" ) );
				}
			});

		}).fail(function() {
			if ( console && console.log ) {
				console.log( "Failed loading components section", arguments );
			}
		});
	}

	function pluralize( count, singular, plural ) {
		return count === 1 ? singular : plural;
	}

	function themeFetch() {
		return $.ajax( themeUrl(), {
			dataType: "jsonp"
		});
	}

	// update hash to reflect model
	function updateHash() {
		Hash.update( QueryString.encode( model ), true );
	}

	Hash.on( "change", function( hash ) {
		setModel( QueryString.parse( hash ) );
	});

	Hash.init();

	// Binds click on version selection
	$( "#download-builder [name=version]" ).on( "change", loadComponents );

	// Loads components
	loadComponents();

	// Loads theme section.
	themeFetch().done(function( themeSection ) {
		$( "#download-builder .theme-area" ).html( themeSection );

		if ( !model.themeParams ) {
			setModel({ themeParams: escape( $( "#theme option:selected" ).val() ) });
		}

		$( "#theme" ).on( "click change", function() {
			var selected = $( this ).find( "option:selected" );
			setModel({
				folderName: selected.text().toLowerCase().replace( " ", "-" ),
				themeParams: escape( selected.val() )
			});
			downloadOnOff();
		});

		$( "#download-builder .advanced-settings input" ).each(function() {
			var content = $( this ).next().detach();
			$( this ).tooltip({
				items: "*",
				content: function() {
					return content;
				}
			});
		});

		$( "#scope" ).on( "keyup", function() {
			if ( !$( "#theme-folder-name" ).data( "edited" ) ) {
				$( "#theme-folder-name" ).data( "suggestedEdit", true );
				$( "#theme-folder-name" ).val( $( this ).val().replace( /[ \/\\]/g, "-" ).replace( /[\.\#]/g, "" ) );
			}
		});

		$( "#theme-folder-name" ).on( "keyup", function() {
			var val = $( this ).val(),
				escapedVal = val.replace( /[ \.\#\/\\]/g, "-" );
			$( this ).data( "edited", true );
			$( "#theme-folder-name" ).removeData( "suggestedEdit" );
			if ( escapedVal !== val ) {
				$( this ).val( escapedVal );
			}
		});

		$( "#theme-folder-name" ).on( "blur", function() {
			if ( $( this ).val() === "" ) {
				$( "#theme-folder-name" ).removeData( "edited" );
			}
		});
	}).fail(function() {
		if ( console && console.log ) {
			console.log( "Failed loading theme section", arguments );
		}
	});

}( _, jQuery, Hash, QueryString ) );
