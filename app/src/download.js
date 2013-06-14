/*jshint jquery: true, browser: true */
/*global DownloadBuilder: false, Hash: false, JST: false, Model: false */
/*!
 * jQuery UI DownloadBuilder client-side JavaScript file
 * http://jqueryui.com/download/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( $, DownloadBuilder, Hash, JST, Model, undefined ) {

	var allComponents, dependencies, dependents, model,
		componentsLoad = $.Deferred(),
		downloadBuilder =  $( "#download-builder" ),
		themesLoad = $.Deferred(),
		baseVars = downloadBuilder.data( "base-vars" ),
		downloadJqueryuiHost = downloadBuilder.data( "download-jqueryui-host" ),
		initialComponents = downloadBuilder.data( "initial-components" );

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

	function downloadOnOff() {
		if ( !$( "input[type=checkbox][data-dependencies]" ).filter( ":checked" ).length && $( "#theme" ).val() === "none" ) {
			$( "#download-builder input[type=submit]" ).prop( "disabled", true ).addClass( "ui-state-disabled" );
		} else {
			$( "#download-builder input[type=submit]" ).prop( "disabled", false ).removeClass( "ui-state-disabled" );
		}
	}

	function initComponents( components ) {
		$( "#download-builder .components-area" ).html( JST[ "components.html" ]( components ) );
		downloadBuilder = new DownloadBuilder( "#download-builder" ).on({
			"check": function( event, components, value, extra ) {
				if ( extra.affectedDependents && extra.affectedDependents.length ) {
					event.preventDefault();
					$( "<div>" )
						.attr( "title", "Remove " + extra.affectedComponentNames.join( ", " ) + "?" )
						.append(
							$( "<p>" ).html(
								"Are you sure you want to remove <b>" + extra.affectedComponentNames.join( ", " ) + "</b>? The following " + pluralize( extra.affectedDependents.length, "component", "components" ) + " " + pluralize( extra.affectedDependents.length, "depends", "depend" ) + " on it and will be removed: " + extra.affectedDependents.map(function() {
									return "<b>" + this.name + "</b>";
								}).toArray().join( ", " ) + "."
							)
						)
						.dialog({
							modal: true,
							buttons: {
								"Remove": function() {
									event.defaultAction();
									$( this ).remove();
								},
								"Cancel": function() {
									$( this ).remove();
								}
							}
						})
						.dialog( "widget" ).addClass( "download-builder-dialog" );
				}
			},
			"accumulated-change": function( event, components, value ) {
				var changes = {};
				components.each(function() {
					var component = $( this );
					changes[ component.attr( "name" ) ] = value;
				});
				model.set( changes );
				downloadOnOff();
			}
		});

		// Zip categories' components.
		allComponents = $.map( components.categories, function( category ) {
			return category.components;
		});

		// Flatten it and return name only.
		allComponents = $.map( allComponents, function( component ) {
			return component.name;
		});

		model.setOrderedComponents( allComponents );

		/* Remember components check/uncheck selection
			- If a component is checked/unchecked, it should keep its check-state in a subsequent version-change or page-load;
			- If a component is loaded in the page and there is no previous check-state for it, it should be checked unless it has an unchecked dependency;
		*/
		$.each( allComponents, function() {
			var name = this,
				elem = $( "input[name=\"" + name + "\"]" );
			if ( model.has( name ) && model.get( name ) === false ) {
				downloadBuilder.set( elem, false );
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
		if ( "folderName" in changed && !model.get( "folderName" ).length ) {
			delete model.attributes.folderName;
			delete changed.folderName;
		}
		if ( "scope" in changed && !model.get( "scope" ).length ) {
			delete model.attributes.scope;
			delete changed.scope;
		}
		themesLoad.done(function() {
			var themeOption;
			if ( "folderName" in changed ) {
				$( "#theme-folder-name" ).val( model.get( "folderName" ) ).trigger( "change" );
			}
			if ( "scope" in changed ) {
				$( "#scope" ).val( model.get( "scope" ) ).trigger( "change" );
			}
			if ( "themeParams" in changed ) {
				themeOption = $( "#theme option[value=\"" + model.get( "themeParams" ) + "\"]" );
				if ( !themeOption.filter( ":selected" ) ) {
					themeOption.prop( "selected", true ).trigger( "change" );
				}
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
						downloadBuilder.set( $( this ), false );
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
				initComponents( initialComponents );
			} else {
				model.unsetOrderedComponents();
				componentsFetch().done(function( components ) {
					initComponents( components );
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

	/* jqueryui.com site overrides for DB */
	$( "#content" ).attr( "id", "download-builder-content" );

	// Loads theme section.
	themeFetch().done(function( theme ) {
		$( "#download-builder .theme-area" ).html( JST[ "theme.html" ]( theme ) );

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

		$( "#scope" ).on("change", function() {
			if ( !$( "#theme-folder-name" ).data( "edited" ) ) {
				$( "#theme-folder-name" ).data( "suggestedEdit", true );
				model.set({ folderName: $( this ).val().replace( /[ \/\\]/g, "-" ).replace( /[\.\#]/g, "" ) });
			}
			model.set({ scope: $( this ).val() });
		});

		$( "#theme-folder-name" ).on({
			"blur": function() {
				if ( $( this ).val() === "" ) {
					$( "#theme-folder-name" ).removeData( "edited" );
				}
			},
			"change": function() {
				var val = $( this ).val(),
					escapedVal = val.replace( /[ \.\#\/\\]/g, "-" );
				$( this ).data( "edited", true );
				$( "#theme-folder-name" ).removeData( "suggestedEdit" );
				if ( escapedVal !== val ) {
					model.set({ folderName: escapedVal });
				} else {
					model.set({ folderName: $( this ).val() });
				}
			}
		});

		themesLoad.resolve();
	}).fail(function() {
		if ( console && console.log ) {
			console.log( "Failed loading theme section", arguments );
		}
	});

}( jQuery, DownloadBuilder, Hash, JST, Model ) );
