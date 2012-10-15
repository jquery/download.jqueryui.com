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

	//color pickers setup (sets bg color of inputs)
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



	/*
	 plugin resources from here down
	*/

	// $Id: farbtastic.js,v 1.2 2007/01/08 22:53:01 unconed Exp $
	// Farbtastic 1.2

	jQuery.fn.farbtastic = function (callback) {
	$.farbtastic(this, callback);
	return this;
	};

	jQuery.farbtastic = function (container, callback) {
	// ???
	container = $(container).get(0);
	return container.farbtastic || (container.farbtastic = new jQuery._farbtastic(container, callback));
	};

	jQuery._farbtastic = function (container, callback) {
	// Store farbtastic object
	var e,
		fb = this;

	// Insert markup
	$(container).html('<div class="farbtastic"><div class="color"></div><div class="wheel"></div><div class="overlay"></div><div class="h-marker marker"></div><div class="sl-marker marker"></div></div>');
	e = $('.farbtastic', container);
	fb.wheel = $('.wheel', container).get(0);
	// Dimensions
	fb.radius = 84;
	fb.square = 100;
	fb.width = 194;

	// Fix background PNGs in IE6
	if (navigator.appVersion.match(/MSIE [0-6]\./)) {
	$('*', e).each(function () {
	if (this.currentStyle.backgroundImage !== 'none') {
	var image = this.currentStyle.backgroundImage;
	image = this.currentStyle.backgroundImage.substring(5, image.length - 2);
	$(this).css({
	'backgroundImage': 'none',
	'filter': "progid:DXImageTransform.Microsoft.AlphaImageLoader(enabled=true, sizingMethod=crop, src='" + image + "')"
	});
	}
	});
	}

	/**
	* Link to the given element(s) or callback.
	*/
	fb.linkTo = function (callback) {
	// Unbind previous nodes
	if (typeof fb.callback === 'object') {
	$(fb.callback).unbind('keyup', fb.updateValue);
	}

	// Reset color
	fb.color = null;

	// Bind callback or elements
	if (typeof callback === 'function') {
	fb.callback = callback;
	}
	else if (typeof callback === 'object' || typeof callback === 'string') {
	fb.callback = $(callback);
	fb.callback.bind('keyup', fb.updateValue);
	if (fb.callback.get(0).value) {
	fb.setColor(fb.callback.get(0).value);
	}
	}
	return this;
	};
	fb.updateValue = function (event) {
	if (this.value && this.value !== fb.color) {
	fb.setColor(this.value);
	if ( fb.formChange ) {
		clearInterval( fb.formChange );
	}
	fb.formChange = setTimeout(function() {
		formChange();
	}, 200);
	}
	};

	/**
	* Change color with HTML syntax #123456
	*/
	fb.setColor = function (color) {
	var unpack = fb.unpack(color);
	if (fb.color !== color && unpack) {
	fb.color = color;
	fb.rgb = unpack;
	fb.hsl = fb.RGBToHSL(fb.rgb);
	fb.updateDisplay();
	}
	return this;
	};

	/**
	* Change color with HSL triplet [0..1, 0..1, 0..1]
	*/
	fb.setHSL = function (hsl) {
	fb.hsl = hsl;
	fb.rgb = fb.HSLToRGB(hsl);
	fb.color = fb.pack(fb.rgb);
	fb.updateDisplay();
	return this;
	};

	/////////////////////////////////////////////////////

	/**
	* Retrieve the coordinates of the given event relative to the center
	* of the widget.
	*/
	fb.widgetCoords = function (event) {
	var x, y, pos, e, offset,
		el = event.target || event.srcElement,
		reference = fb.wheel;

	if (typeof event.offsetX !== 'undefined') {
	// Use offset coordinates and find common offsetParent
	pos = { x: event.offsetX, y: event.offsetY };

	// Send the coordinates upwards through the offsetParent chain.
	e = el;
	while (e) {
	e.mouseX = pos.x;
	e.mouseY = pos.y;
	pos.x += e.offsetLeft;
	pos.y += e.offsetTop;
	e = e.offsetParent;
	}

	// Look for the coordinates starting from the wheel widget.
	e = reference;
	offset = { x: 0, y: 0 };
	while (e) {
	if (typeof e.mouseX !== 'undefined') {
	x = e.mouseX - offset.x;
	y = e.mouseY - offset.y;
	break;
	}
	offset.x += e.offsetLeft;
	offset.y += e.offsetTop;
	e = e.offsetParent;
	}

	// Reset stored coordinates
	e = el;
	while (e) {
	e.mouseX = undefined;
	e.mouseY = undefined;
	e = e.offsetParent;
	}
	}
	else {
	// Use absolute coordinates
	pos = fb.absolutePosition(reference);
	x = (event.pageX || 0*(event.clientX + $('html').get(0).scrollLeft)) - pos.x;
	y = (event.pageY || 0*(event.clientY + $('html').get(0).scrollTop)) - pos.y;
	}
	// Subtract distance to middle
	return { x: x - fb.width / 2, y: y - fb.width / 2 };
	};

	/**
	* Mousedown handler
	*/
	fb.mousedown = function (event) {
	// Capture mouse
	if (!document.dragging) {
	$(document).bind('mousemove', fb.mousemove).bind('mouseup', fb.mouseup);
	document.dragging = true;
	}

	// Check which area is being dragged
	var pos = fb.widgetCoords(event);
	fb.circleDrag = Math.max(Math.abs(pos.x), Math.abs(pos.y)) * 2 > fb.square;

	// Process
	fb.mousemove(event);
	return false;
	};

	/**
	* Mousemove handler
	*/
	fb.mousemove = function (event) {
	// Get coordinates relative to color picker center
	var hue, sat, lum,
		pos = fb.widgetCoords(event);

	// Set new HSL parameters
	if (fb.circleDrag) {
	hue = Math.atan2(pos.x, -pos.y) / 6.28;
	if (hue < 0) {
		hue += 1;
	}
	fb.setHSL([hue, fb.hsl[1], fb.hsl[2]]);
	}
	else {
	sat = Math.max(0, Math.min(1, -(pos.x / fb.square) + 0.5));
	lum = Math.max(0, Math.min(1, -(pos.y / fb.square) + 0.5));
	fb.setHSL([fb.hsl[0], sat, lum]);
	}
	return false;
	};

	/**
	* Mouseup handler
	*/
	fb.mouseup = function () {
	// Uncapture mouse
	$(document).unbind('mousemove', fb.mousemove);
	$(document).unbind('mouseup', fb.mouseup);
	document.dragging = false;
	formChange();
	};

	/**
	* Update the markers and styles
	*/
	fb.updateDisplay = function () {
	// Markers
	var angle = fb.hsl[0] * 6.28;
	$('.h-marker', e).css({
	left: Math.round(Math.sin(angle) * fb.radius + fb.width / 2) + 'px',
	top: Math.round(-Math.cos(angle) * fb.radius + fb.width / 2) + 'px'
	});

	$('.sl-marker', e).css({
	left: Math.round(fb.square * (0.5 - fb.hsl[1]) + fb.width / 2) + 'px',
	top: Math.round(fb.square * (0.5 - fb.hsl[2]) + fb.width / 2) + 'px'
	});

	// Saturation/Luminance gradient
	$('.color', e).css('backgroundColor', fb.pack(fb.HSLToRGB([fb.hsl[0], 1, 0.5])));

	// Linked elements or callback
	if (typeof fb.callback === 'object') {
	// Set background/foreground color
	$(fb.callback).css({
	backgroundColor: fb.color,
	color: fb.hsl[2] > 0.5 ? '#000' : '#fff'
	});

	// Change linked value
	$(fb.callback).each(function() {
	if (this.value && this.value !== fb.color) {
	this.value = fb.color;
	}
	});
	}
	else if (typeof fb.callback === 'function') {
	fb.callback.call(fb, fb.color);
	}
	};

	/**
	* Get absolute position of element
	*/
	fb.absolutePosition = function (el) {
	var tmp,
		r = { x: el.offsetLeft, y: el.offsetTop };
	// Resolve relative to offsetParent
	if (el.offsetParent) {
		tmp = fb.absolutePosition(el.offsetParent);
		r.x += tmp.x;
		r.y += tmp.y;
	}
	return r;
	};

	/* Various color utility functions */
	fb.pack = function (rgb) {
	var r = Math.round(rgb[0] * 255),
		g = Math.round(rgb[1] * 255),
		b = Math.round(rgb[2] * 255);
	return '#' + (r < 16 ? '0' : '') + r.toString(16) +
	(g < 16 ? '0' : '') + g.toString(16) +
	(b < 16 ? '0' : '') + b.toString(16);
	};

	fb.unpack = function (color) {
	if (color.length === 7) {
	return [parseInt('0x' + color.substring(1, 3), 16) / 255,
	parseInt('0x' + color.substring(3, 5), 16) / 255,
	parseInt('0x' + color.substring(5, 7), 16) / 255];
	}
	else if (color.length === 4) {
	return [parseInt('0x' + color.substring(1, 2), 16) / 15,
	parseInt('0x' + color.substring(2, 3), 16) / 15,
	parseInt('0x' + color.substring(3, 4), 16) / 15];
	}
	};

	fb.HSLToRGB = function (hsl) {
	var m1, m2, r, g, b,
		h = hsl[0], s = hsl[1], l = hsl[2];
	m2 = (l <= 0.5) ? l * (s + 1) : l + s - l*s;
	m1 = l * 2 - m2;
	return [this.hueToRGB(m1, m2, h+0.33333),
	this.hueToRGB(m1, m2, h),
	this.hueToRGB(m1, m2, h-0.33333)];
	};

	fb.hueToRGB = function (m1, m2, h) {
	h = (h < 0) ? h + 1 : ((h > 1) ? h - 1 : h);
	if (h * 6 < 1) {
		return m1 + (m2 - m1) * h * 6;
	}
	if (h * 2 < 1) {
		return m2;
	}
	if (h * 3 < 2) {
		return m1 + (m2 - m1) * (0.66666 - h) * 6;
	}
	return m1;
	};

	fb.RGBToHSL = function (rgb) {
	var min, max, delta, h, s, l,
		r = rgb[0], g = rgb[1], b = rgb[2];
	min = Math.min(r, Math.min(g, b));
	max = Math.max(r, Math.max(g, b));
	delta = max - min;
	l = (min + max) / 2;
	s = 0;
	if (l > 0 && l < 1) {
	s = delta / (l < 0.5 ? (2 * l) : (2 - 2 * l));
	}
	h = 0;
	if (delta > 0) {
	if (max === r && max !== g) {
		h += (g - b) / delta;
	}
	if (max === g && max !== b) {
		h += (2 + (b - r) / delta);
	}
	if (max === b && max !== r) {
		h += (4 + (r - g) / delta);
	}
	h /= 6;
	}
	return [h, s, l];
	};

	// Install mousedown handler (the others are set on the document on-demand)
	$('*', e).mousedown(fb.mousedown);

	// Init color
	fb.setColor('#000000');

	// Set linked elements/callback
	if (callback) {
	fb.linkTo(callback);
	}
	};


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
});

}( jQuery ));

