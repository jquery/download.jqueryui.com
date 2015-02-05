/*jshint jquery: true, browser: true */
/*global Hash: false, JST: false, Model: false, QueryString: false */
/*!
 * jQuery UI ThemeRoller client-side JavaScript file
 * http://jqueryui.com/themeroller/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( $, Hash, JST, Model, QueryString, undefined ) {
	var farbtasticTriggerChangeDelay, model, reloadRollYourOwn, skipHashChange, theme, Theme,
		focusedEl = null,
		openGroups = [],
		textureVars = "bgTextureDefault bgTextureHover bgTextureActive bgTextureHeader bgTextureContent bgTextureHighlight bgTextureError bgTextureOverlay bgTextureShadow".split( " " ),
		themeroller = $( "#themeroller" ),
		baseVars = QueryString.decode( themeroller.data( "base-vars" ) ),
		downloadJqueryuiHost = themeroller.data( "download-jqueryui-host" ),
		textures = themeroller.data( "textures" );

	// Rewrite host for testing on staging
	if ( /^stage\./.test( location.host ) ) {
		downloadJqueryuiHost = downloadJqueryuiHost.replace( /(download\.)/, "stage.$1" );
	}

	// Returns texture url
	function textureUrl( type, width, height ) {
		// ui-bg_<type>_<opacity>_<color>_<width>x<height>.png
		return downloadJqueryuiHost + "/themeroller/images/ui-bg_" + type.replace( /_/g, "-" ) + "_100_555_" + width + "x" + height + ".png";
	}

	function isHexColor( value ) {
		if ( (/[^#a-fA-F0-9]/g).test( value ) ) {
			return false;
		}
		if ( value.lastIndexOf( "#" ) !== 0 ) {
			// If # in any position but 0.
			return false;
		}
		if ( value.length !== 4 && value.length !== 7 ) {
			return false;
		}
		return true;
	}

	// Function to append a new theme stylesheet with the new style changes
	function updateCSS() {
		$( "body" ).append( "<link href=\"" + model.parsethemeUrl() + "\" type=\"text/css\" rel=\"Stylesheet\" />");
		var links = $( "link[href*=parsetheme\\.css]" );
		if ( links.length > 1 ) {
			// Wait a few seconds before removing previous theme(s) to avoid FOUW
			setTimeout(function() {
				links.not( ":last" ).remove();
			}, 5000 );
		}
	}

	// Function called after a change event in the form
	function formChange() {
		model.set( QueryString.decode( themeroller.find( ".application form" ).serialize() ) );
	}

	// Farbtastic hack.
	// TODO: get rid of this hack.
	farbtasticTriggerChangeDelay = 200;
	function updateDisplay( fb, e ) {
		return function() {
			// Markers
			var angle = fb.hsl[ 0 ] * 6.28;
			$( ".h-marker", e ).css({
				left: Math.round( Math.sin( angle ) * fb.radius + fb.width / 2 ) + "px",
				top: Math.round( -Math.cos( angle ) * fb.radius + fb.width / 2 ) + "px"
			});

			$( ".sl-marker", e ).css({
				left: Math.round( fb.square * ( 0.5 - fb.hsl[ 1 ] ) + fb.width / 2 ) + "px",
				top: Math.round( fb.square * ( 0.5 - fb.hsl[ 2 ] ) + fb.width / 2 ) + "px"
			});

			// Saturation/Luminance gradient
			$( ".color", e ).css( "backgroundColor", fb.pack( fb.HSLToRGB( [ fb.hsl[ 0 ], 1, 0.5 ] ) ) );

			// Linked elements or callback
			if ( typeof fb.callback === "object" ) {
				// Set background/foreground color
				$( fb.callback ).css({
					backgroundColor: fb.color,
					color: fb.hsl[ 2 ] > 0.5 ? "#000" : "#fff"
				});

				// Change linked value
				$( fb.callback ).each(function() {
					if ( this.value && this.value !== fb.color ) {
						var element = $( this );
						element.val( fb.color );
						if( fb.triggerChange ) {
							clearInterval( fb.triggerChange );
						}
						fb.triggerChange = setTimeout(function() {
							element.trigger( "change" );
						}, farbtasticTriggerChangeDelay);
					}
				});
			} else if ( typeof fb.callback === "function" ) {
				fb.callback.call( fb, fb.color );
			}
		};
	}

	// Set up spindowns
	$.fn.spinDown = function() {
		return this.on( "click", function( event ) {
			var $this = $( this );

			$this.next().slideToggle( 100 );
			$this.find( ".arrow-icon" ).toggleClass( "icon-triangle-1-s" ).end().toggleClass( "state-active" );

			if ( $this.is( ".corner-all" ) ) {
				$this.removeClass( "corner-all" ).addClass( "corner-top" );
			} else if ( $this.is( ".corner-top" ) ) {
				$this.removeClass( "corner-top" ).addClass( "corner-all" );
			}
			event.preventDefault();
		});
	};

	// Color pickers setup (sets bg color of inputs)
	$.fn.applyFarbtastic = function() {
		return this.each(function() {
			$( "<div/>" ).farbtastic( this ).remove();
		});
	};

	/**
	 * App
	 */
	function appInit() {
		/* jqueryui.com site overrides for TR */
		$( "#content" ).attr( "id", "themeroller-content" );

		$( "#rollerTabs" ).tabs();

		themeGalleryInit();

		// General app click cleanup
		$( "body" ).on( "click", function( event ) {
			if ( $( event.target ).is( "input.hex.focus" ) || $( event.target ).parent().is( "div.texturePicker.focus" ) ) {
				return;
			}
			themeroller.find( "div.picker-on" ).removeClass( "picker-on" );
			$( "#picker" ).remove();
			themeroller.find( "input.focus, select.focus" ).removeClass( "focus" );
			themeroller.find( "div.texturePicker ul:visible" ).hide().parent().css( "position", "static" );
		});

		// Links to roll your own from help tab
		$( "#help a[href=\"#rollYourOwn\"]" ).on( "click", function( event ) {
			$( "#rollerTabs" ).tabs( "option", "active", 0 );
			event.preventDefault();
		});

		// Links to theme gallery from help tab
		$( "#help a[href=\"#themeGallery\"]" ).on( "click", function( event ) {
			$( "#rollerTabs" ).tabs( "option", "active", 1 );
			event.preventDefault();
		});

		$( "#reverse-background" ).on( "click", function() {
			var maskArea = themeroller,
				textElems = themeroller.find( ".demoHeaders, #demo-options" );
			if ( $( this ).is( ":checked" ) ) {
				maskArea.css({ background: "#333" });
				textElems.css({ color: "#CCC" });
			} else {
				maskArea.css({ background: "#FFF" });
				textElems.css({ color: "#000" });
			}
		});
	}

	function rollYourOwnInit() {
		$( "#rollYourOwn" ).html( JST[ "rollyourown.html" ]( rollYourOwnObject() ) );
		model.downloadUrl(function( url ) {
			$( "#downloadTheme" ).attr( "href", url );
		});
		$( "#downloadTheme" ).on({
			"click": function() {
				var form = $( this ).parent().find( "form" );
				if ( form.find( ".state-error" ).length ) {
					// TODO: tell user submit has been cancelled, because there are errors!
					return false;
				}
			}
		});

		// Hover class toggles in app panel
		themeroller.find( "li.state-default, div.state-default" )
			.mouseenter(function() {
				$( this ).addClass( "state-hover" );
			})
			.mouseleave(function() {
				$( this ).removeClass( "state-hover" );
			});

		// Hex inputs
		themeroller.find( "input.hex" )
			.on({
				"change": function() {
					$( this ).trigger( "validate" );
				},
				"click": function( event ) {

					// TODO: do we need the `#picker` id?
					var farbtastic,
						picker = $( "<div id=\"picker\"></div>" );
					$( this ).addClass( "focus" );
					$( "#picker" ).remove();
					themeroller.find( "div.picker-on" ).removeClass( "picker-on" );
					themeroller.find( "div.texturePicker ul:visible" ).hide( 0 ).parent().css( "position", "static" );
					$( this ).after( picker ).parent().addClass( "picker-on" );

					// Farbtastic hack.
					// TODO: get rid of this hack.
					farbtastic = $.farbtastic( picker, this );
					farbtastic.updateDisplay = updateDisplay( farbtastic, picker.find( ".farbtastic" ) );
					event.preventDefault();
				},
				"validate": function() {
					// Validate hex colors
					if ( isHexColor( $( this ).val() ) ) {
						$( this ).removeClass( "state-error" );
					} else {
						$( this ).addClass( "state-error" );
					}
				}
			})
			.trigger( "validate" )
			.wrap( "<div class=\"hasPicker\"></div>" )
			.applyFarbtastic();

		// Focus and blur classes in form
		themeroller.find( "input, select" )
		.focus(function() {
			themeroller.find( "input.focus, select.focus" ).removeClass( "focus" );
			$( this ).addClass( "focus" );
		})
		.blur(function() {
			$( this ).removeClass( "focus" );
		});

		// Texture pickers from select menus
		themeroller.find( "select.texture" ).each(function() {

			$( this ).after( "<div class=\"texturePicker\"><a href=\"#\"></a><ul></ul></div>" );
			var texturePicker = $( this ).next(),
				a = texturePicker.find( "a" ),
				ul = texturePicker.find( "ul" ),
				sIndex = texturePicker.prev().get( 0 ).selectedIndex;

			// Scrape options
			$( this ).find( "option" ).each(function() {
				ul.append( "<li class=\"" + $( this ).attr( "value" ) + "\" data-texturewidth=\"" + $( this ).attr( "data-texturewidth" ) + "\" data-textureheight=\"" + $( this ).attr( "data-textureheight" ) + "\" style=\"background: #555555 url(" +  textureUrl( $( this ).attr( "value" ), $( this ).attr( "data-texturewidth" ), $( this ).attr( "data-textureheight" ) ) + ") 50% 50% repeat\"><a href=\"#\" title=\"" + $( this ).text() + "\">" + $( this ).text() + "</a></li>" );
				if( $( this ).get( 0 ).index === sIndex ) {
					texturePicker.attr( "title", $( this ).text() ).css( "background", "#555555 url(" + textureUrl( $( this ).attr( "value" ), $( this ).attr( "data-texturewidth" ), $( this ).attr( "data-textureheight" ) ) + ") 50% 50% repeat" );
				}
			});

			ul.find( "li" ).on( "click", function( event ) {
				texturePicker.prev().get( 0 ).selectedIndex = texturePicker.prev().find( "option[value="+ $( this ).attr( "class" ).replace( /\./g, "\\." ) +"]" ).get( 0 ).index;
				texturePicker.attr( "title", $( this ).text() ).css( "background", "#555555 url(" + textureUrl( $( this ).attr( "class" ), $( this ).attr( "data-texturewidth" ), $( this ).attr( "data-textureheight" ) ) + ") 50% 50% repeat" );
				ul.fadeOut( 100 );
				formChange();
				event.preventDefault();
			});

			// Hide the menu and select el
			ul.hide();

			// Show/hide of menus
			texturePicker.on( "click", function( event ) {
				$( this ).addClass( "focus" );
				$( "#picker" ).remove();
				var showIt;
				if ( ul.is( ":hidden" ) ) {
					showIt = true;
				}
				themeroller.find( "div.texturePicker ul:visible" ).hide().parent().css( "position", "static" );
				if ( showIt === true ) {
					texturePicker.css( "position", "relative" );
					ul.show();
				}

				event.preventDefault();
			});
		});

		// Ensures numbers only are entered for opacity inputs
		themeroller.find( "input.opacity" ).on( "change", function() {
			var withinThreshold,
				number = parseInt( $( this ).val(), 10 );
			if( isNaN( number ) ) {
				$( this ).val( "" );
			} else {
				withinThreshold = Math.max( 0, Math.min( 100, number ) );
				if ( $( this ).val() !== withinThreshold ) {
					$( this ).val( withinThreshold );
				}
			}
		});

		// Spindowns in TR panel
		themeroller.find( "div.theme-group .theme-group-header" ).addClass( "corner-all" ).spinDown();

		// Change event in form
		themeroller.find( ".application form" ).on({
			"change": function( event ) {
				formChange();
				event.preventDefault();
			},
			"submit": function( event ) {
				event.preventDefault();
			},
			"validate": function() {
				var form = $( this ).parent().find( "form" );
				if ( form.find( ".state-error" ).length ) {
					$( "#downloadTheme" ).addClass( "ui-state-disabled" );
				} else {
					$( "#downloadTheme" ).removeClass( "ui-state-disabled" );
				}
			}
		});

		if ( openGroups.length > 0 ) {
			$.each( openGroups, function() {
				themeroller.find( ".theme-group-content:eq( " + this + " )" ).prev().trigger( "click" );
			});
		}
		if( focusedEl ) {
			themeroller.find( "form" ).find( "input, select, .texturePicker" ).eq( focusedEl ).click();
		}
	}

	// TODO move this away into an external themeRoller helper.
	function rollYourOwnObject() {
		var augmentGroups, hashColor, textureOptions,
			attributes = model.attributes;
		augmentGroups = function( groups ) {
			var fns = {
				font: function( attributes ) {
					return {
						isFontType: true,
						options: $.map([ "normal", "bold" ], function( type ) {
							return {
								name: type,
								type: type,
								selected: type === attributes.fwDefault ? " selected" : ""
							};
						})
					};
				},
				corner: function( attributes ) {
					return {
						isCornerType: true
					};
				},
				"default": function( attributes ) {
					var titles = {
							Header: "Header/Toolbar",
							Content: "Content",
							Default: "Clickable: default state",
							Hover: "Clickable: hover state",
							Active: "Clickable: active state",
							Highlight: "Highlight",
							Error: "Error"
						},
						classes = {
							Header: "ui-widget-header",
							Content: "ui-widget-content",
							Default: "ui-state-default",
							Hover: "ui-state-hover",
							Active: "ui-state-active",
							Highlight: "ui-state-highlight",
							Error: "ui-state-error"
						},
						extension = {
							isDefaultType: true,
							title: titles[ attributes.name ],
							"class": classes[ attributes.name ]
						};
					$.each([ "bgColor", "bgImgOpacity", "borderColor", "fc", "iconColor" ], function() {
						var attr = this;
						extension[ attr + "Name" ] = attr + attributes.name;
						extension[ attr + "Value" ] = attributes[ attr + attributes.name ];
					});
					$.each([ "bgColor", "borderColor", "fc", "iconColor" ], function() {
						var attr = this;
						extension[ attr + "Value" ] = hashColor( extension[ attr + "Value" ] );
					});
					extension.bgTextureName = "bgTexture" + attributes.name;
					extension.bgTextureOptions = textureOptions( attributes[ "bgTexture" + attributes.name ] );
					return extension;
				},
				modaloverlay: function( attributes ) {
					var bgColorOverlay = hashColor( attributes.bgColorOverlay );
					return {
						isModaloverlayType: true,
						bgColorOverlay: bgColorOverlay,
						bgTextureOverlayOptions: textureOptions( attributes.bgTextureOverlay, "true" )
					};
				},
				dropshadow: function( attributes ) {
					var bgColorShadow = hashColor( attributes.bgColorShadow );
					return {
						isDropshadowType: true,
						bgColorShadow: bgColorShadow,
						bgTextureShadowOptions: textureOptions( attributes.bgTextureShadow, "true" )
					};
				}
			};
			return $.map( groups, function( group ) {
				return $.extend( group, fns[ group.type ]( group ) );
			});
		};

		// Add '#' in the beginning of the colors if needed
		hashColor = function( color ) {
				if ( ( color.length === 3 || color.length === 6 ) && /^[0-9a-f]+$/i.test( color ) ) {
					color = "#" + color;
				}
				return color;
		};

		// Returns select options with textures - configured to each theme group
		textureOptions = function( select, panel ) {
			var optSet = [];
			$.each( textures, function() {
				var texture = this,
					name = texture.type,
					selected = texture.type === select ? " selected=\"selected\"" : "";
				// Large images need hard coded icon sizes to be useful
				if ( texture.width * texture.height >= 360000 ) {
					texture.width = texture.height = 16;
				}
				// Tall panel element (content, overlay, shadow, etc), don't allow glass texture
				if ( panel === "true" ) {
					if( texture.type !== "glass" ) {
						optSet.push({
							type: texture.type,
							selected: selected,
							width: texture.width,
							height: texture.height,
							name: name
						});
					}
				} else {
					optSet.push({
						type: texture.type,
						selected: selected,
						width: texture.width,
						height: texture.height,
						name: name
					});
				}
			});
			return optSet;
		};

		return {
			host: downloadJqueryuiHost,
			groups: augmentGroups([{
				type: "font",
				ffDefault: attributes.ffDefault,
				fsDefault: attributes.fsDefault,
				fwDefault: attributes.fwDefault
			}, {
				type: "corner",
				cornerRadius: attributes.cornerRadius
			}, {
				type: "default",
				name: "Header",
				bgColorHeader: attributes.bgColorHeader,
				bgTextureHeader: attributes.bgTextureHeader,
				bgImgOpacityHeader: attributes.bgImgOpacityHeader,
				borderColorHeader: attributes.borderColorHeader,
				fcHeader: attributes.fcHeader,
				iconColorHeader: attributes.iconColorHeader
			}, {
				type: "default",
				name: "Content",
				bgColorContent: attributes.bgColorContent,
				bgTextureContent: attributes.bgTextureContent,
				bgImgOpacityContent: attributes.bgImgOpacityContent,
				borderColorContent: attributes.borderColorContent,
				fcContent: attributes.fcContent,
				iconColorContent: attributes.iconColorContent
			}, {
				type: "default",
				name: "Default",
				bgColorDefault: attributes.bgColorDefault,
				bgTextureDefault: attributes.bgTextureDefault,
				bgImgOpacityDefault: attributes.bgImgOpacityDefault,
				borderColorDefault: attributes.borderColorDefault,
				fcDefault: attributes.fcDefault,
				iconColorDefault: attributes.iconColorDefault
			}, {
				type: "default",
				name: "Hover",
				bgColorHover: attributes.bgColorHover,
				bgTextureHover: attributes.bgTextureHover,
				bgImgOpacityHover: attributes.bgImgOpacityHover,
				borderColorHover: attributes.borderColorHover,
				fcHover: attributes.fcHover,
				iconColorHover: attributes.iconColorHover
			}, {
				type: "default",
				name: "Active",
				bgColorActive: attributes.bgColorActive,
				bgTextureActive: attributes.bgTextureActive,
				bgImgOpacityActive: attributes.bgImgOpacityActive,
				borderColorActive: attributes.borderColorActive,
				fcActive: attributes.fcActive,
				iconColorActive: attributes.iconColorActive
			}, {
				type: "default",
				name: "Highlight",
				bgColorHighlight: attributes.bgColorHighlight,
				bgTextureHighlight: attributes.bgTextureHighlight,
				bgImgOpacityHighlight: attributes.bgImgOpacityHighlight,
				borderColorHighlight: attributes.borderColorHighlight,
				fcHighlight: attributes.fcHighlight,
				iconColorHighlight: attributes.iconColorHighlight
			}, {
				type: "default",
				name: "Error",
				bgColorError: attributes.bgColorError,
				bgTextureError: attributes.bgTextureError,
				bgImgOpacityError: attributes.bgImgOpacityError,
				borderColorError: attributes.borderColorError,
				fcError: attributes.fcError,
				iconColorError: attributes.iconColorError
			}, {
				type: "modaloverlay",
				bgColorOverlay: attributes.bgColorOverlay,
				bgTextureOverlay: attributes.bgTextureOverlay,
				bgImgOpacityOverlay: attributes.bgImgOpacityOverlay,
				opacityOverlay: attributes.opacityOverlay
			}, {
				type: "dropshadow",
				bgTextureShadow: attributes.bgTextureShadow,
				bgColorShadow: attributes.bgColorShadow,
				bgImgOpacityShadow: attributes.bgImgOpacityShadow,
				opacityShadow: attributes.opacityShadow,
				thicknessShadow: attributes.thicknessShadow,
				offsetTopShadow: attributes.offsetTopShadow,
				offsetLeftShadow: attributes.offsetLeftShadow,
				cornerRadiusShadow: attributes.cornerRadiusShadow
			}])
		};
	}

	function themeGalleryInit() {
		// Loading and viewing gallery themes
		$( "#themeGallery a" )
			.on( "click", function( event ) {
				model.set( QueryString.decode( this.href.split( "?" )[ 1 ] ) );
				event.preventDefault();
			})
			.attr( "title", "Click to preview this theme" )
			.each(function() {
				$( this ).after(
					"<a href=\"#\" class=\"download\" title=\"Download this theme\">Download</a>" +
					"<a href=\"#\" class=\"edit\" title=\"Customize this theme\">Edit</a>" );
			})
			.parent()
			.find( "a.edit" )
			.on( "click", function( event ) {
				reloadRollYourOwn = true;
				model.set( QueryString.decode( $( this ).parent().find( "a:first-child" ).attr( "href" ).split( "?" )[ 1 ] ) );
				$( "#rollerTabs" ).tabs( "option", "active", 0 );
				event.preventDefault();
			});
		updateThemeGalleryDownloadLink();
	}

	function updateThemeGalleryDownloadLink() {
		$( "#themeGallery a.download" ).each(function() {
			var elem = $( this );
			model.downloadUrl(function( url ) {
				elem.attr( "href", url );
			}, elem.parent().find( "a:first-child" ).data( "z-theme-params" ) );
		});
	}

	function demoInit() {
		// Accordion
		$( "#accordion" ).accordion({ header: "h3" });

		// Autocomplete
		$( "#autocomplete" ).autocomplete({
			source: [ "c++", "java", "php", "coldfusion", "javascript", "asp", "ruby", "python", "c", "scala", "groovy", "haskell", "perl" ]
		});

		// Button
		$( "#button" ).button();
		$( "#radioset").buttonset();

		// Tabs
		$( "#tabs" ).tabs();

		// Dialog
		$( "#dialog" ).dialog({
			autoOpen: false,
			width: 600,
			buttons: [
				{
					text: "Ok",
					click: function() { $( this ).dialog( "close" ); }
				}, {
					text: "Cancel",
					click: function() { $( this ).dialog( "close" ); }
				}
			]
		});

		// Dialog Link
		$( "#dialog-link" ).on( "click", function( event ) {
			$( "#dialog" ).dialog( "open" );
			event.preventDefault();
		});

		// Datepicker
		$( "#datepicker" ).datepicker({
			inline: true
		});

		// Slider
		$( "#slider" ).slider({
			range: true,
			values: [ 17, 67 ]
		});

		// Progressbar
		$( "#progressbar" ).progressbar({
			value: 20
		});

		// Hover states on the static widgets
		$( "#dialog-link, #icons li" )
			.mouseenter(function() {
				$( this ).addClass( "ui-state-hover" );
			})
			.mouseleave(function() {
				$( this ).removeClass( "ui-state-hover" );
			});

		// Spinner
		$( "#spinner" ).spinner();

		// Menu
		$( "#menu" ).menu();

		// Selectmenu
		$( "#selectmenu" ).selectmenu({
			width: 150
		});

		// Tooltip
		$( "#tooltip" ).tooltip();
	}

	function rollYourOwnLoad() {
		// Roll Your Own:
		// Remember which groups are open
		openGroups = [];
		$( "div.theme-group-content" ).each(function( i ) {
			if ( $( this ).is( ":visible" ) ) {
				openGroups.push( i );
			}
		});

		// Remember any focused element
		focusedEl = null;
		themeroller.find( "form" ).find( "input, select, .texturePicker" ).each(function( i ) {
			if ( $( this ).is( ".focus" ) ) {
				focusedEl = i;
			}
		});

		rollYourOwnInit();
	}

	model = new Model.ThemeRoller({
		baseVars: baseVars,
		host: downloadJqueryuiHost
	});

	// Update textureVars from previous filename format (eg. 02_glass.png) to type-only format (eg. glass). Changed on images generation rewrite (port to nodejs).
	function oldImagesBackCompat( changed ) {
		var modified;
		$.each( changed, function( changed ) {
			var newValue, pair, value;
			if ( $.inArray( changed, textureVars ) >= 0 ) {
				value = model.get( changed );
				newValue = value.replace( /[0-9]*_([^\.]*).png/, "$1" );
				if ( value !== newValue ) {
					pair = {};
					pair[ changed ] = newValue;
					model.set( pair );
					modified = true;
				}
			}
		});
		if ( modified ) {
			return true;
		}
	}

	model.on( "change", function ( changed ) {
		if ( oldImagesBackCompat( changed ) ) {
			return;
		}
		if ( "downloadParams" in changed ) {
			updateThemeGalleryDownloadLink();
		}
		if ( reloadRollYourOwn && !( "zThemeParams" in changed ) ) {
			reloadRollYourOwn = false;
			rollYourOwnLoad();
			model.downloadUrl(function( url ) {
				$( "#downloadTheme" ).attr( "href", url );
			});
		}
		model.downloadUrl(function( url ) {
			$( "#downloadTheme" ).attr( "href", url );
		});
		updateCSS();
		if ( skipHashChange ) {
			skipHashChange = false;
		} else {
			model.querystring().done(function( querystring ) {
				Hash.update( querystring, {
					ignoreChange: true
				});
			});
		}
	});

	Hash.on( "change", function( hash ) {
		reloadRollYourOwn = true;
		model.parseHash( hash );
	});

	skipHashChange = true;
	model.set( baseVars );

	appInit();
	rollYourOwnInit();
	demoInit();
	Hash.init();

}( jQuery, Hash, JST, Model, QueryString ) );
