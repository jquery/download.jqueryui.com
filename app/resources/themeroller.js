/*jshint jquery: true, browser: true */
/*global Hash: false */
/*!
 * jQuery UI Theme Roller client-side JavaScript file
 * http://jqueryui.com/themeroller/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
;(function( $, Hash, undefined ) {
	var theme, Theme,
		escape = window.escape,
		focusedEl = null,
		lastRollYourOwnLoad = 0,
		openGroups = [],
		themeroller = $( "#themeroller" ),
		baseVars = themeroller.data( "base-vars" ),
		downloadJqueryuiHost = themeroller.data( "download-jqueryui-host" ),
		imageGeneratorUrl = themeroller.data( "image-generator-url" );

	// rewrite host for testing on staging
	if ( /^stage\./.test( location.host ) ) {
		downloadJqueryuiHost = downloadJqueryuiHost.replace( /(download\.)/, "stage.$1" );
	}

	// function to append a new theme stylesheet with the new style changes
	function updateCSS( locStr ){
		$( "body" ).append( "<link href=\"" + downloadJqueryuiHost + "/themeroller/parsetheme.css" + ( locStr ? "?" + locStr : "" ) + "\" type=\"text/css\" rel=\"Stylesheet\" />");
		var links = $( "link[href*=parsetheme\\.css]" );
		if ( links.length > 1 ) {
			// wait a few seconds before removing previous theme(s) to avoid FOUW
			setTimeout(function() {
				links.not( ":last" ).remove();
			}, 5000 );
		}
	}

	// function called after a change event in the form
	function formChange(){
		var locStr = $( "#themeroller .application form" ).serialize();
		locStr = Hash.clean( locStr );
		updateCSS( locStr );
		Hash.update( locStr, true );
	}

	// set up spindowns
	$.fn.spinDown = function() {
		return this.click(function() {
			var $this = $( this );

			$this.next().slideToggle( 100 );
			$this.find( ".arrow-icon" ).toggleClass( "icon-triangle-1-s" ).end().toggleClass( "state-active" );

			if ( $this.is( ".corner-all" ) ) {
				$this.removeClass( "corner-all" ).addClass( "corner-top" );
			} else if ( $this.is( ".corner-top" ) ) {
				$this.removeClass( "corner-top" ).addClass( "corner-all" );
			}
			return false;
		});
	};

	// validation for hex inputs
	$.fn.validHex = function() {
		return this.each(function() {
			var value = $( this ).val();
			value = value.replace( /[^#a-fA-F0-9]/g, "" ); // non [#a-f0-9]
			value = value.toLowerCase();
			if ( value.match( /#/g ) && value.match( /#/g ).length > 1 ) {
				value = value.replace( /#/g, "" ); // ##
			}
			if ( value.indexOf( "#" ) === -1 ) {
				value = "#"+value; // no #
			}
			if ( value.length > 7 ) {
				value = value.substr( 0, 7 ); // too many chars
			}
			$( this ).val( value );
		});
	};

	// color pickers setup (sets bg color of inputs)
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

		// general app click cleanup
		$( "body" ).click(function() {
			$( "div.picker-on", themeroller ).removeClass( "picker-on" );
			$( "#picker" ).remove();
			$( "input.focus, select.focus", themeroller ).removeClass( "focus" );
			$( "div.texturePicker ul:visible", themeroller ).hide().parent().css( "position", "static" );
		});

		// links to roll your own from help tab
		$( "#help a[href=\"#rollYourOwn\"]" ).click(function() {
			$( "#rollerTabs" ).tabs( "select", 0 );
			return false;
		});

		// links to theme gallery from help tab
		$( "#help a[href=\"#themeGallery\"]" ).click(function() {
			$( "#rollerTabs" ).tabs( "select", 1 );
			return false;
		});

		$( "#reverse-background" ).click(function() {
			var maskArea = $( ".mask-area", themeroller );
			if ( $( this ).is( ":checked" ) ) {
				maskArea.css( { background: "#333" } );
				$( ".demoHeaders", themeroller ).css( { color: "#CCC" } );
			} else {
				maskArea.css( { background: "#FFF" } );
				$( ".demoHeaders", themeroller ).css( { color: "#000" } );
			}
		});
	}

	function rollYourOwnInit() {
		// hover class toggles in app panel
		$( "li.state-default, div.state-default", themeroller ).hover(
			function(){ $( this ).addClass( "state-hover" ); },
			function(){ $( this ).removeClass( "state-hover" ); }
		);

		// hex inputs
		$( "input.hex", themeroller )
			.validHex()
			.keyup(function() {
				$( this ).validHex();
			})
			.click(function(){
				$( this ).addClass( "focus" );
				$( "#picker" ).remove();
				$( "div.picker-on", themeroller ).removeClass( "picker-on" );
				$( "div.texturePicker ul:visible", themeroller ).hide( 0 ).parent().css( "position", "static" );
				$( this ).after( "<div id=\"picker\"></div>" ).parent().addClass( "picker-on" );
				$( "#picker" ).farbtastic( this );
				return false;
			})
			.wrap( "<div class=\"hasPicker\"></div>" )
			.applyFarbtastic();

		// focus and blur classes in form
		$( "input, select", themeroller )
		.focus(function() {
			$( "input.focus, select.focus", themeroller ).removeClass( "focus" );
			$( this ).addClass( "focus" );
		})
		.blur(function() {
			$( this ).removeClass( "focus" );
		});

		// texture pickers from select menus
		$( "select.texture", themeroller ).each(function() {

			$( this ).after( "<div class=\"texturePicker\"><a href=\"#\"></a><ul></ul></div>" );
			var texturePicker = $( this ).next(),
				a = texturePicker.find( "a" ),
				ul = texturePicker.find( "ul" ),
				sIndex = texturePicker.prev().get( 0 ).selectedIndex;

			// scrape options
			$( this ).find( "option" ).each(function(){
				ul.append( "<li class=\"" + $( this ).attr( "value" ) + "\" data-texturewidth=\"" + $( this ).attr( "data-texturewidth" ) + "\" data-textureheight=\"" + $( this ).attr( "data-textureheight" ) + "\" style=\"background: #555555 url(" +  imageGeneratorUrl + "?new=555555&w=" + $( this ).attr( "data-texturewidth" ) + "&h=" + $( this ).attr( "data-textureheight" ) + "&f=png&q=100&fltr[]=over|textures/" + $( this ).attr( "value" ) + "|0|0|100 ) 50% 50% repeat\"><a href=\"#\" title=\"" + $( this ).text() + "\">" + $( this ).text() + "</a></li>" );
				if( $( this ).get( 0 ).index === sIndex ) {
					texturePicker.attr( "title", $( this ).text() ).css( "background", "#555555 url(" + imageGeneratorUrl + "?new=555555&w=" + $( this ).attr( "data-texturewidth" ) + "&h=" + $( this ).attr( "data-textureheight" ) + "&f=png&q=60&fltr[]=over|textures/" + $( this ).attr( "value" ) + "|0|0|100 ) 50% 50% repeat" );
				}
			});

			ul.find( "li" ).click(function() {
				texturePicker.prev().get( 0 ).selectedIndex = texturePicker.prev().find( "option[value="+ $( this ).attr( "class" ).replace( /\./g, "\\." ) +"]" ).get( 0 ).index;
				texturePicker.attr( "title", $( this ).text() ).css( "background", "#555555 url(" + imageGeneratorUrl + "?new=555555&w=" + $( this ).attr( "data-texturewidth" )+"&h=" + $( this ).attr( "data-textureheight" )+"&f=png&q=100&fltr[]=over|textures/" + $( this ).attr( "class" )+"|0|0|100 ) 50% 50% repeat" );
				ul.fadeOut( 100 );
				formChange();
				return false;
			});

			// hide the menu and select el
			ul.hide();

			// show/hide of menus
			texturePicker.click(function() {
				$( this ).addClass( "focus" );
				$( "#picker" ).remove();
				var showIt;
				if ( ul.is( ":hidden" ) ) {
					showIt = true;
				}
				$( "div.texturePicker ul:visible", themeroller ).hide().parent().css( "position", "static" );
				if ( showIt === true ) {
					texturePicker.css( "position", "relative" );
					ul.show();
				}

				return false;
			});
		});

		// ensures numbers only are entered for opacity inputs
		$( "input.opacity", themeroller ).on( "keyup", function() {
			var number = parseInt( this.value, 10 );
			if( isNaN( number ) ) {
				this.value = "";
				return;
			}
			this.value = Math.max( 0, Math.min( 100, number ) );
		});

		// spindowns in TR panel
		$( "div.theme-group .theme-group-header", themeroller ).addClass( "corner-all" ).spinDown();

		// change event in form
		$( ".application form", themeroller ).bind( "change", function() {
			formChange();
			return false;
		}).bind( "submit", function( event ) {
			event.preventDefault();
		});

		//DL theme button
		$( "#downloadTheme" ).click(function(){
			var themeParams,
				href = $( "link[href*=parsetheme\\.css]:last" ).attr( "href" ).replace( "","" );
			themeParams = href.split( "?" )[ 1 ];
			location.href = "/download?themeParams=" + ( themeParams ? escape( themeParams ) : escape( baseVars ) );
			return false;
		});

		if ( openGroups.length > 0 ) {
			openGroups.join( "," ); $( ".theme-group-content:eq( " + openGroups + " )", themeroller ).prev().trigger( "click" );
		}
		if( focusedEl ) {
			$( "form input, form select, form .texturePicker" ).eq( focusedEl ).click();
		}
	}

	function themeGalleryInit() {
		// loading and viewing gallery themes
		$( "#themeGallery a" )
			.click(function() {
				Hash.update( Hash.clean( this.href.split( "?" )[ 1 ] ) );
				return false;
			})
			.attr( "title", "Click to preview this theme" )
			.each(function() {
				$( this ).after(
				"<a href=\"/download?themeParams=" + escape( $( this ).attr( "href" ).split( "?" )[ 1 ] ) + "\" class=\"download\" title=\"Download this theme\">Download</a>" +
				"<a href=\"#\" class=\"edit\" title=\"Customize this theme\">Edit</a>" );
			})
			.parent()
			.find( "a.edit" )
			.click(function() {
				$( this ).prev().prev().trigger( "click" );
				$( "#rollerTabs" ).tabs( "select", 0 );
				return false;
			});
	}

	function demoInit() {
		// Accordion
		$( "#accordion" ).accordion( { header: "h3" } );

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
			buttons: {
				"Ok": function() {
					$( this ).dialog( "close" );
				},
				"Cancel": function() {
					$( this ).dialog( "close" );
				}
			}
		});

		// Dialog Link
		$( "#dialog_link" ).click(function(){
			$( "#dialog" ).dialog( "open" );
			return false;
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

		// hover states on the static widgets
		$( "#dialog_link, ul#icons li" ).hover(
			function() { $( this ).addClass( "ui-state-hover" ); },
			function() { $( this ).removeClass( "ui-state-hover" ); }
		);

		// Spinner
		$( "#spinner" ).spinner();

		// Menu
		$( "#menu" ).menu();

		// Tooltip
		$( "p", themeroller ).tooltip({
			items: "img[alt]",
			content: function() {
				return $( this ).attr( "alt" );
			}
		});
	}

	function rollYourOwnLoad( hash ) {
		var curr = ++lastRollYourOwnLoad;
		$.ajax( downloadJqueryuiHost + "/themeroller/rollyourown?themeParams=" + escape( hash ), {
			dataType: "jsonp",
			success: function( response ) {
				if ( curr !== lastRollYourOwnLoad ) {
					return;
				}
				$( "#rollYourOwn" ).html( response );
				rollYourOwnInit();
			},
			error: function() {
				if ( console && console.log ) {
					console.log( "Failed to reload rollYourOwn tab", arguments );
				}
			}
		});
	}

	Hash.on( "change", function( hash ) {
		// Roll Your Own
		// remember which groups are open
		openGroups = [];
		$( "div.theme-group-content" ).each(function( i ) {
			if ( $( this ).is( ":visible" ) ) {
				openGroups.push( i );
			}
		});

		// remember any focused element
		focusedEl = null;
		$( "form input, form select, form .texturePicker" ).each(function( i ) {
			if ( $( this ).is( ".focus" ) ) {
				focusedEl = i;
			}
		});

		rollYourOwnLoad( hash );

		// Theme css
		updateCSS( hash );
	});

	Hash.init();

	// dom loaded
	$(function() {
		appInit();
		demoInit();
		rollYourOwnLoad( baseVars );
	});
}( jQuery, Hash ) );
