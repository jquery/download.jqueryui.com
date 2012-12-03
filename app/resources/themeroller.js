/*jshint jquery: true, browser: true */
/*global _: false, escape: true, Hash: false, QueryString: false */
/*!
 * jQuery UI Theme Roller client-side JavaScript file
 * http://jqueryui.com/themeroller/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( _, $, Hash, QueryString, undefined ) {
	var theme, Theme,
		focusedEl = null,
		lastRollYourOwnLoad = 0,
		model = {},
		openGroups = [],
		themeroller = $( "#themeroller" ),
		baseVars = themeroller.data( "base-vars" ),
		downloadJqueryuiHost = themeroller.data( "download-jqueryui-host" ),
		imageGeneratorUrlPart = themeroller.data( "image-generator-url" );

	// Rewrite host for testing on staging
	if ( /^stage\./.test( location.host ) ) {
		downloadJqueryuiHost = downloadJqueryuiHost.replace( /(download\.)/, "stage.$1" );
	}

	function setModel( attributes, opts ) {
		opts = opts || {};
		if ( typeof opts.updateHash === "undefined" ) { opts.updateHash = true; }
		_.extend( model, attributes );
		if ( opts.reloadRollYourOwn ) {
			rollYourOwnLoad(function() {
				$( "#downloadTheme" ).attr( "href", downloadUrl( model ) );
			});
		}
		$( "#downloadTheme" ).attr( "href", downloadUrl( model ) );
		updateCSS();
		if ( opts.updateHash ) { updateHash(); }
		updateThemeGalleryDownloadLink();
	}

	// A different model structure used by several resources
	function downloadBuilderModel( model ) {
		return _.extend({
			themeParams: escape( QueryString.encode( _.omit( model, "version" ) ) )
		}, _.pick( model, "version" ) );
	}

	// Returns download url
	function downloadUrl( customModel ) {
		return "/download/?" + QueryString.encode( downloadBuilderModel( customModel || model ) );
	}

	// Returns imageGenerator url
	function imageGeneratorUrl( texturewidth, textureheight, value ) {
		return imageGeneratorUrlPart + "/?new=555555&w=" + texturewidth + "&h=" + textureheight + "&f=png&q=100&fltr[]=over|textures/" + value + "|0|0|100";
	}

	// Returns parsetheme url
	function parsethemeUrl() {
		return downloadJqueryuiHost + "/themeroller/parsetheme.css/?" + QueryString.encode( model );
	}

	// Fetches rollYourOwn content
	function rollYourOwnFetch() {
		return $.ajax( downloadJqueryuiHost + "/themeroller/rollyourown", {
			dataType: "jsonp",
			data: downloadBuilderModel( model )
		});
	}

	// Function to append a new theme stylesheet with the new style changes
	function updateCSS() {
		$( "body" ).append( "<link href=\"" + parsethemeUrl() + "\" type=\"text/css\" rel=\"Stylesheet\" />");
		var links = $( "link[href*=parsetheme\\.css]" );
		if ( links.length > 1 ) {
			// Wait a few seconds before removing previous theme(s) to avoid FOUW
			setTimeout(function() {
				links.not( ":last" ).remove();
			}, 5000 );
		}
	}

	// Update hash to reflect model
	function updateHash() {
		Hash.update( QueryString.encode( model ), true );
	}

	// Function called after a change event in the form
	function formChange() {
		setModel( QueryString.decode( themeroller.find( ".application form" ).serialize() ) );
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

	// Validation for hex inputs
	$.fn.validHex = function() {
		return this.each(function() {
			var value = $( this ).val();
			value = value.replace( /[^#a-fA-F0-9]/g, "" );
			value = value.toLowerCase();
			if ( value.match( /#/g ) && value.match( /#/g ).length > 1 ) {
				// ##
				value = value.replace( /#/g, "" );
			}
			if ( value.indexOf( "#" ) === -1 ) {
				// No #
				value = "#"+value;
			}
			if ( value.length > 7 ) {
				// Too many chars
				value = value.substr( 0, 7 );
			}
			$( this ).val( value );
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
		$( "#rollerTabs" ).tabs();

		themeGalleryInit();

		// General app click cleanup
		$( "body" ).on( "click", function( event ) {
			if ( $( event.target ).is( "input.hex.focus" )
				|| $( event.target ).parent().is( "div.texturePicker.focus" ) ) {
				return;
			}
			themeroller.find( "div.picker-on" ).removeClass( "picker-on" );
			$( "#picker" ).remove();
			themeroller.find( "input.focus, select.focus" ).removeClass( "focus" );
			themeroller.find( "div.texturePicker ul:visible" ).hide().parent().css( "position", "static" );
		});

		// Links to roll your own from help tab
		$( "#help a[href=\"#rollYourOwn\"]" ).on( "click", function( event ) {
			$( "#rollerTabs" ).tabs( "select", 0 );
			event.preventDefault();
		});

		// Links to theme gallery from help tab
		$( "#help a[href=\"#themeGallery\"]" ).on( "click", function( event ) {
			$( "#rollerTabs" ).tabs( "select", 1 );
			event.preventDefault();
		});

		$( "#reverse-background" ).on( "click", function() {
			var maskArea = themeroller.find( ".mask-area" );
			if ( $( this ).is( ":checked" ) ) {
				maskArea.css({ background: "#333" });
				themeroller.find( ".demoHeaders" ).css({ color: "#CCC" });
			} else {
				maskArea.css({ background: "#FFF" });
				themeroller.find( ".demoHeaders" ).css({ color: "#000" });
			}
		});
	}

	function rollYourOwnInit() {
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
			.validHex()
			.keyup(function() {
				$( this ).validHex();
			})
			.on( "click", function( event ) {
				$( this ).addClass( "focus" );
				$( "#picker" ).remove();
				themeroller.find( "div.picker-on" ).removeClass( "picker-on" );
				themeroller.find( "div.texturePicker ul:visible" ).hide( 0 ).parent().css( "position", "static" );
				$( this ).after( "<div id=\"picker\"></div>" ).parent().addClass( "picker-on" );
				$( "#picker" ).farbtastic( this );
				event.preventDefault();
			})
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
				ul.append( "<li class=\"" + $( this ).attr( "value" ) + "\" data-texturewidth=\"" + $( this ).attr( "data-texturewidth" ) + "\" data-textureheight=\"" + $( this ).attr( "data-textureheight" ) + "\" style=\"background: #555555 url(" +  imageGeneratorUrl( $( this ).attr( "data-texturewidth" ), $( this ).attr( "data-textureheight" ), $( this ).attr( "value" ) ) + ") 50% 50% repeat\"><a href=\"#\" title=\"" + $( this ).text() + "\">" + $( this ).text() + "</a></li>" );
				if( $( this ).get( 0 ).index === sIndex ) {
					texturePicker.attr( "title", $( this ).text() ).css( "background", "#555555 url(" + imageGeneratorUrl( $( this ).attr( "data-texturewidth" ), $( this ).attr( "data-textureheight" ), $( this ).attr( "value" ) ) + ") 50% 50% repeat" );
				}
			});

			ul.find( "li" ).on( "click", function( event ) {
				texturePicker.prev().get( 0 ).selectedIndex = texturePicker.prev().find( "option[value="+ $( this ).attr( "class" ).replace( /\./g, "\\." ) +"]" ).get( 0 ).index;
				texturePicker.attr( "title", $( this ).text() ).css( "background", "#555555 url(" + imageGeneratorUrl( $( this ).attr( "data-texturewidth" ), $( this ).attr( "data-textureheight" ), $( this ).attr( "class" ) ) + ") 50% 50% repeat" );
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
		themeroller.find( "input.opacity" ).on( "keyup", function() {
			var number = parseInt( this.value, 10 );
			if( isNaN( number ) ) {
				this.value = "";
				return;
			}
			this.value = Math.max( 0, Math.min( 100, number ) );
		});

		// Spindowns in TR panel
		themeroller.find( "div.theme-group .theme-group-header" ).addClass( "corner-all" ).spinDown();

		// Change event in form
		themeroller.find( ".application form" ).on( "change", function( event ) {
			formChange();
			event.preventDefault();
		}).on( "submit", function( event ) {
			event.preventDefault();
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

	function updateThemeGalleryDownloadLink() {
		$( "#themeGallery a.download" )
			.each(function() {
				var downloadModel = _.extend( {}, model, QueryString.decode( $( this ).parent().find( "a:first-child" ).attr( "href" ).split( "?" )[ 1 ] ) );
				 $( this ).attr( "href", downloadUrl( downloadModel ) );
			});
	}

	function themeGalleryInit() {
		// Loading and viewing gallery themes
		$( "#themeGallery a" )
			.on( "click", function( event ) {
				Hash.update( Hash.clean( this.href.split( "?" )[ 1 ] ) );
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
				setModel( QueryString.decode( $( this ).parent().find( "a:first-child" ).attr( "href" ).split( "?" )[ 1 ] ), {
					reloadRollYourOwn: true
				});
				$( "#rollerTabs" ).tabs( "select", 0 );
				event.preventDefault();
			});

			updateThemeGalleryDownloadLink();
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
		$( "#dialog_link" ).on( "click", function( event ) {
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
		$( "#dialog_link, #icons li" )
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

		// Tooltip
		themeroller.find( "p" ).tooltip({
			items: "img[alt]",
			content: function() {
				var alt = $( this ).attr( "alt" );
				// Escape alt, since we're going from an attribute to raw HTML
				return $( "<a>" ).text( alt ).html();
			}
		});
	}

	function rollYourOwnLoad( success ) {
		var curr = ++lastRollYourOwnLoad;

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

		rollYourOwnFetch().done(function( response ) {
			if ( curr !== lastRollYourOwnLoad ) {
				return;
			}
			$( "#rollYourOwn" ).html( response );
			rollYourOwnInit();
			if ( success ) { success(); }
		}).fail(function() {
			if ( console && console.log ) {
				console.log( "Failed to reload rollYourOwn tab", arguments );
			}
		});
	}

	setModel( QueryString.decode( baseVars ), {
		updateHash: false
	});

	Hash.on( "change", function( hash ) {
		setModel( QueryString.decode( hash ), {
			reloadRollYourOwn: true
		});
	});

	appInit();
	demoInit();
	rollYourOwnLoad();
	Hash.init();

}( _, jQuery, Hash, QueryString ) );
