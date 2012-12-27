/*jshint jquery: true, browser: true */
/*global Hash: false, Model: false */
/*!
 * jQuery UI DownloadBuilder client-side JavaScript file
 * http://jqueryui.com/download/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( $, Hash, Model, undefined ) {

	var dependencies, dependents, model,
		componentsLoad = $.Deferred(),
		downloadBuilder = $( "#download-builder" ),
		themesLoad = $.Deferred(),
		baseVars = downloadBuilder.data( "base-vars" ),
		downloadJqueryuiHost = downloadBuilder.data( "download-jqueryui-host" );

	// Rewrite form action for testing on staging
	if ( /^stage\./.test( location.host ) ) {
		$( "#download-builder form" ).attr( "action", function( index, href ) {
			return href.replace( /(download\.)/, "stage.$1" );
		});
		downloadJqueryuiHost = downloadJqueryuiHost.replace( /(download\.)/, "stage.$1" );
	}

	function componentsFetch() {
		return $.ajax( downloadJqueryuiHost + "/download/components/", {
			dataType: "jsonp",
			data: {
				version: model.get( "version" )
			}
		});
	}

	function themeFetch() {
		var dfd = $.Deferred();
		model.themeUrl(function( url ) {
			$.ajax( url, {
				dataType: "jsonp"
			}).done( dfd.resolve ).fail( dfd.fail );
		});
		return dfd;
	}

	function allComponents() {
		return $( "#download-builder .component-group-list input[type=checkbox]" );
	}

	function allGroup( referenceElement ) {
		return $( referenceElement ).closest( ".component-group" ).find( ".component-group-list input[type=checkbox]" );
	}

	function _check( elem, value ) {
		var modelUpdates = {};
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

			modelUpdates[ name ] = value;
		});
		model.set( modelUpdates );
		downloadOnOff();
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

	function initComponents( html ) {
		dependencies = {};
		dependents = {};

		$( "#download-builder .components-area").html( html );

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

		/* Remember components check/uncheck selection
			- If a component is checked/unchecked, it should keep its check-state in a subsequent version-change or page-load;
			- If a component is loaded in the page and there is no previous check-state for it, it should be checked unless it has an unchecked dependency;
		*/
		allComponents().each(function() {
			var elem = $( this ),
				name = elem.attr( "name" );
			if ( model.has( name ) && model.get( name ) === false ) {
				_check( elem, false );
			}
		});

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

		componentsLoad.resolve();
	}

	function pluralize( count, singular, plural ) {
		return count === 1 ? singular : plural;
	}

	model = new Model.DownloadBuilder({
		baseVars: baseVars,
		host: downloadJqueryuiHost
	});
	model.defaults[ "version" ] = $( "#download-builder [name=version]" ).first().val();

	model.on( "change", function( changed, created ) {
		themesLoad.done(function() {
			if ( "folderName" in changed ) {
				$( "#theme-folder-name" ).val( model.get( "folderName" ) ).trigger( "change" );
			}
			if ( "scope" in changed ) {
				$( "#scope" ).val( model.get( "scope" ) ).trigger( "change" );
			}
			if ( "themeParams" in changed ) {
				$( "#theme option[value=\"" + model.get( "themeParams" ) + "\"]" ).prop( "selected", true ).trigger( "change" );
			}
			model.themerollerUrl(function( url ) {
				$( "#download-builder .download-builder-header a.themeroller-link" ).attr( "href", url );
			});
		});

		componentsLoad.done(function() {
			$.each( changed, function( attribute ) {
				var value = model.get( attribute );
				// If attribute is a component.
				$( "#download-builder .component-group-list input[name=\"" + attribute + "\"]" ).each(function() {
					// "false" -> false, TODO: this should be handled at History() level.
					if ( value === "false" ) {
						model.attributes[ attribute ] = value = false;
					}
					if ( value === false && $( this ).prop( "checked" ) !== value ) {
						_check( $( this ), false );
					}
					// Ignore checked-components in the model
					if ( value ) {
						delete model.attributes[ attribute ];
					}
				});
			});
		});

		if ( "version" in changed ) {
			$( "#download-builder [name=version][value=\"" + model.get( "version" ) + "\"]" ).trigger( "click" );
			if ( created.version ) {
				initComponents();
			} else {
				componentsFetch().done(function( html ) {
					initComponents( html );
				}).fail(function() {
					if ( console && console.log ) {
						console.log( "Failed loading components section", arguments );
					}
				});
				componentsLoad = $.Deferred();
			}
		}

		model.querystring().done(function( querystring ) {
			Hash.update( querystring, {
				ignoreChange: true
			});
		});
	});

	Hash.on( "change", function( hash ) {
		model.parseHash( hash );
	});

	// Binds click on version selection
	$( "#download-builder [name=version]" ).on( "change", function() {
		model.set({ version: $( this ).val() });
	});

	model.set({
		version: model.defaults[ "version" ]
	});

	Hash.init();

	// Loads theme section.
	themeFetch().done(function( themeSection ) {
		$( "#download-builder .theme-area" ).html( themeSection );

		if ( !model.has( "themeParams" ) && !model.has( "zThemeParams" ) ) {
			model.defaults[ "themeParams" ] = $( "#theme option:nth-child(2)" ).val();
			model.set({ themeParams: $( "#theme option:selected" ).val() });
		}

		$( "#theme" ).on( "change", function() {
			var selected = $( this ).find( "option:selected" ),
				folderName = selected.text().toLowerCase().replace( " ", "-" );
			model.defaults[ "folderName" ] = folderName;
			model.set({
				folderName: folderName,
				themeParams: selected.val()
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

		$( "#scope" ).on({
			"change": function() {
				model.set({ scope: $( this ).val() });
			},
			"keyup": function() {
				if ( !$( "#theme-folder-name" ).data( "edited" ) ) {
					$( "#theme-folder-name" ).data( "suggestedEdit", true );
					model.set({ folderName: $( this ).val().replace( /[ \/\\]/g, "-" ).replace( /[\.\#]/g, "" ) });
				}
			}
		});

		$( "#theme-folder-name" ).on({
			"blur": function() {
				if ( $( this ).val() === "" ) {
					$( "#theme-folder-name" ).removeData( "edited" );
				}
			},
			"change": function() {
				model.set({ folderName: $( this ).val() });
			},
			"keyup": function() {
				var val = $( this ).val(),
					escapedVal = val.replace( /[ \.\#\/\\]/g, "-" );
				$( this ).data( "edited", true );
				$( "#theme-folder-name" ).removeData( "suggestedEdit" );
				if ( escapedVal !== val ) {
					model.set({ folderName: escapedVal });
				}
			}
		});

		themesLoad.resolve();
	}).fail(function() {
		if ( console && console.log ) {
			console.log( "Failed loading theme section", arguments );
		}
	});

}( jQuery, Hash, Model ) );
