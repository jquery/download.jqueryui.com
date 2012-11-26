/*jshint jquery: true, browser: true */
;(function( $, undefined ) {

	var hash,
		openGroups = [],
		focusedEl = null,
		escape = window.escape,
		baseVars = $( "#themeroller" ).data( "base-vars" ),
		downloadJqueryuiHost = $( "#themeroller" ).data( "download-jqueryui-host" ),
		imageGeneratorUrl = $( "#themeroller" ).data( "image-generator-url" );

	// rewrite host for testing on staging
	if ( /^stage\./.test( location.host ) ) {
		downloadJqueryuiHost = downloadJqueryuiHost.replace( /(download\.)/, "stage.$1" );
	}

	/**
	 * App
	 */

	$( "#reverse-background" ).click(function() {
		var maskArea = $( ".mask-area" );
		if ( $(this).is( ":checked" ) ) {
			maskArea.css( { background: "#333" } );
			$( ".demoHeaders" ).css( { color: "#CCC" } );
		} else {
			maskArea.css( { background: "#FFF" } );
			$( ".demoHeaders" ).css( { color: "#000" } );
		}
	});

	//global for tracking open and focused toolbar panels on refresh

	//backbutton and hash bookmarks support
		hash = {
		storedHash: "",
		currentTabHash: "", //The hash that"s only stored on a tab switch
		cache: "",
		interval: null,
		listen: true, // listen to hash changes?

		// start listening again
		startListening: function() {
			setTimeout(function() {
				hash.listen = true;
			}, 600 );
		},

		// stop listening to hash changes
		stopListening: function() {
			hash.listen = false;
		},

		//check if hash has changed
		checkHashChange: function() {
			var locStr = hash.currHash();
			if ( hash.storedHash !== locStr ) {
				if ( hash.listen === true ) {
					hash.refreshToHash(); //update was made by back button
				}
				hash.storedHash = locStr;
			}

			if ( !hash.interval ) {
				hash.interval = setInterval( hash.checkHashChange, 500 );
			}
		},

		//refresh to a certain hash
		refreshToHash: function( locStr ) {
			var newHash;
			if ( locStr ) {
				newHash = true;
			}
			locStr = locStr || hash.currHash();

			updateCSS( locStr );

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

			// reload tab
			$.ajax( downloadJqueryuiHost + "/themeroller/rollyourown?themeParams=" + escape( locStr ), {
				dataType: "jsonp",
				success: function( response ) {
					$( "#rollYourOwn" ).html( response );
					initRollOver();
				},
				error: function() {
					console.log( "Failed to reload rollYourOwn tab", arguments );
				}
			});

			// if the hash is passed
			if ( newHash ) {
				hash.updateHash( locStr, true );
			}
		},

		updateHash: function( locStr, ignore ) {
			if ( ignore === true ) {
				hash.stopListening();
			}
			window.location.hash = locStr;
			if ( ignore === true ) {
				hash.storedHash = locStr;
				hash.startListening();
			}
		},

		clean: function( locStr ) {
			return locStr.replace( /%23/g, "" ).replace( /[\?#]+/g, "" );
		},

		currHash: function() {
			return hash.clean( window.location.hash );
		},

		currSearch: function() {
			return hash.clean( window.location.search );
		},

		init: function(){
			hash.storedHash = "";
			hash.checkHashChange();
		}
	};

	//function to append a new theme stylesheet with the new style changes
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

	//function called after a change event in the form
	function formChange(){
		var locStr = $( "#themeroller .application form" ).serialize();
		locStr = hash.clean( locStr );
		updateCSS( locStr );
		hash.updateHash( locStr, true );
	}

	//set up spindowns
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




	// events within the "roll your own" tab
	function rollYourOwnBehaviors() {

		// hover class toggles in app panel
		$( "li.state-default, div.state-default" ).hover(
			function(){ $( this ).addClass( "state-hover" ); },
			function(){ $( this ).removeClass( "state-hover" ); }
		);

		// hex inputs
		$( "input.hex" )
			.validHex()
			.keyup(function() {
				$( this ).validHex();
			})
			.click(function(){
				$( this ).addClass( "focus" );
				$( "#picker" ).remove();
				$( "div.picker-on" ).removeClass( "picker-on" );
				$( "div.texturePicker ul:visible" ).hide( 0 ).parent().css( "position", "static" );
				$( this ).after( "<div id=\"picker\"></div>" ).parent().addClass( "picker-on" );
				$( "#picker" ).farbtastic( this );
				return false;
			})
			.wrap( "<div class=\"hasPicker\"></div>" )
			.applyFarbtastic();

		// focus and blur classes in form
		$( "input, select" )
		.focus(function() {
			$( "input.focus, select.focus" ).removeClass( "focus" );
			$( this ).addClass( "focus" );
		})
		.blur(function() {
			$( this ).removeClass( "focus" );
		});

		// texture pickers from select menus
		$( "select.texture" ).each(function() {

			$( this ).after( "<div class=\"texturePicker\"><a href=\"#\"></a><ul></ul></div>" );
			var texturePicker = $( this ).next(),
				a = texturePicker.find( "a" ),
				ul = texturePicker.find( "ul" ),
				sIndex = texturePicker.prev().get( 0 ).selectedIndex;

			// scrape options
			$( this ).find( "option" ).each(function(){
				ul.append( "<li class=\"" + $( this ).attr( "value" ) + "\" data-texturewidth=\"" + $( this ).attr( "data-texturewidth" ) + "\" data-textureheight=\"" + $( this ).attr( "data-textureheight" ) + "\" style=\"background: #555555 url(" +  imageGeneratorUrl + "?new=555555&w=" + $( this ).attr( "data-texturewidth" ) + "&h=" + $( this ).attr( "data-textureheight" ) + "&f=png&q=100&fltr[]=over|textures/" + $( this ).attr( "value" ) + "|0|0|100 ) 50% 50% repeat\"><a href=\"#\" title=\"" + $( this ).text() + "\">" + $( this ).text() + "</a></li>" );
				if( $( this ).get( 0 ).index === sIndex ) {
					texturePicker.attr( "title",$( this ).text() ).css( "background", "#555555 url(" + imageGeneratorUrl + "?new=555555&w=" + $( this ).attr( "data-texturewidth" ) + "&h=" + $( this ).attr( "data-textureheight" ) + "&f=png&q=60&fltr[]=over|textures/" + $( this ).attr( "value" ) + "|0|0|100 ) 50% 50% repeat" );
				}
			});

			ul.find( "li" ).click(function() {
				texturePicker.prev().get( 0 ).selectedIndex = texturePicker.prev().find( "option[value="+ $( this ).attr( "class" ).replace( /\./g, "\\." ) +"]" ).get( 0 ).index;
				texturePicker.attr( "title",$( this ).text() ).css( "background", "#555555 url(" + imageGeneratorUrl + "?new=555555&w="+$( this ).attr( "data-texturewidth" )+"&h="+$( this ).attr( "data-textureheight" )+"&f=png&q=100&fltr[]=over|textures/"+$( this ).attr( "class" )+"|0|0|100 ) 50% 50% repeat" );
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
				$( "div.texturePicker ul:visible" ).hide().parent().css( "position", "static" );
				if ( showIt === true ) {
					texturePicker.css( "position", "relative" );
					ul.show();
				}

				return false;
			});
		});

		// ensures numbers only are entered for opacity inputs
		$( "input.opacity" ).on( "keyup", function() {
			var number = parseInt( this.value, 10 );
			if( isNaN( number ) ) {
				this.value = "";
				return;
			}
			this.value = Math.max( 0, Math.min( 100, number ) );
		});

		// spindowns in TR panel
		$( "div.theme-group .theme-group-header" ).addClass( "corner-all" ).spinDown();

		// change event in form
		$( "#themeroller .application form" ).bind( "change", function() {
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
	}


	// events within the theme gallery
	function themeGalleryBehaviors() {

		// loading and viewing gallery themes
		$( "#themeGallery a" )
			.bind( "click", function() {
				updateCSS( hash.clean( this.href.split( "?" )[ 1 ] ));
				hash.updateHash( hash.clean( this.href.split( "?" )[ 1 ] ), true );
				return false;
			})
			.attr( "title", "Click to preview this theme" )
			.each(function(){
				$( this ).after(
				"<a href=\"/download?themeParams=" + escape( $( this ).attr( "href" ).split( "?" )[ 1 ] ) + "\" class=\"download\" title=\"Download this theme\">Download</a>"+
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

	function initRollOver() {
		rollYourOwnBehaviors();
		if( openGroups.length > 0 ){
			openGroups.join( "," ); $( ".theme-group-content:eq( "+openGroups+" )" ).prev().trigger( "click" );
		}
		if( focusedEl ){
			$( "form input, form select, form .texturePicker" ).eq( focusedEl ).click();
		}
		openGroups = [];
		focusedEl = null;
	}


	// dom ready event
	$(function() {

		//app tabs
		$( "#rollerTabs" ).tabs( {
			load: function( e, ui ){
				initRollOver();
			},
			spinner: "Loading...",
			select: function( e,ui ){
				if( $( ui.panel ).is( "#rollYourOwn" )  && hash.currHash() !== hash.currentTabHash ) { // Stop if we actually don"t have a hash change
					hash.refreshToHash();
				}
				hash.currentTabHash = hash.currHash();
			}
		});

		//events and behaviors for rollyourown
		rollYourOwnBehaviors();

		//events and behaviors for themeGallery
		themeGalleryBehaviors();

		//general app click cleanup
		$( "body" ).click(function() {
			$( "div.picker-on" ).removeClass( "picker-on" );
			$( "#picker" ).remove();
			$( "input.focus, select.focus" ).removeClass( "focus" );
			$( "div.texturePicker ul:visible" ).hide().parent().css( "position", "static" );
		});

		//links to roll your own from help tab
		$( "#help a[href=\"#rollYourOwn\"]" ).click(function() {
			$( "#rollerTabs" ).tabs( "select", 0 );
			return false;
		});

		//links to theme gallery from help tab
		$( "#help a[href=\"#themeGallery\"]" ).click(function() {
			$( "#rollerTabs" ).tabs( "select", 1 );
			return false;
		});

		if ( hash.currSearch() ) {
			location.href = "/themeroller/#" + hash.currSearch();
		} else {
			updateCSS();
		}

		//start hash tracking listening
		hash.init();

	});


	/**
	 * UI Demos
	 */
$(function() {
	// Accordion
	$("#accordion").accordion({ header: "h3" });

	// Autocomplete
	$("#autocomplete").autocomplete({
		source: ["c++", "java", "php", "coldfusion", "javascript", "asp", "ruby", "python", "c", "scala", "groovy", "haskell", "perl"]
	});

	// Button
	$("#button").button();
	$("#radioset").buttonset();

	// Tabs
	$('#tabs').tabs();

	// Dialog
	$('#dialog').dialog({
		autoOpen: false,
		width: 600,
		buttons: {
			"Ok": function() {
				$(this).dialog("close");
			},
			"Cancel": function() {
				$(this).dialog("close");
			}
		}
	});

	// Dialog Link
	$('#dialog_link').click(function(){
		$('#dialog').dialog('open');
		return false;
	});

	// Datepicker
	$('#datepicker').datepicker({
		inline: true
	});

	// Slider
	$('#slider').slider({
		range: true,
		values: [17, 67]
	});

	// Progressbar
	$("#progressbar").progressbar({
		value: 20
	});

	// hover states on the static widgets
	$('#dialog_link, ul#icons li').hover(
		function() { $(this).addClass('ui-state-hover'); },
		function() { $(this).removeClass('ui-state-hover'); }
	);

	// Spinner
	$( "#spinner" ).spinner();

	// Menu
	$( "#menu" ).menu();

	// Tooltip
	$( "p" ).tooltip({
		items: "img[alt]",
		content: function() {
			return $( this ).attr( "alt" );
		}
	});

});

}( jQuery ));

