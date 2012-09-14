/*jshint jquery: true, browser: true */
// FIXME coding standards
// FIXME themeParams=?undefined
;(function( $, undefined ) {

	/**
	 * App
	 */

	//add js to html element for css selectors
	document.documentElement.className = 'js';

	//global - TR app or bookmarklet
	var bookmarklet = window.location.href.indexOf('developertool') > -1;

	//global for tracking open and focused toolbar panels on refresh
	var openGroups = [];
	var focusedEl = null;

	//backbutton and hash bookmarks support
	var hash = {
		storedHash: '',
		currentTabHash: '', //The hash that's only stored on a tab switch
		cache: '',
		interval: null,
		listen: true, // listen to hash changes?

		 // start listening again
		startListening: function() {
			setTimeout(function() {
				hash.listen = true;
			}, 600);
		},

		 // stop listening to hash changes
		stopListening: function() {
			hash.listen = false;
		},

		//check if hash has changed
		checkHashChange: function() {

			var locStr = hash.currHash();
			if(hash.storedHash != locStr) {
				if(hash.listen == true) hash.refreshToHash(); ////update was made by back button
				hash.storedHash = locStr;
			}

			if(!hash.interval) hash.interval = setInterval(hash.checkHashChange, 500);

		},

		//refresh to a certain hash
		refreshToHash: function(locStr) {

			if(locStr) var newHash = true;
			locStr = locStr || hash.currHash();

			updateCSS(locStr);

			// remember which groups are open
			openGroups = [];
			$('div.theme-group-content').each(function(i){
				if($(this).is(':visible')){openGroups.push(i);}
			});

			// remember any focused element
			focusedEl = null;
			$('form input, form select, form .texturePicker').each(function(i){
				if($(this).is('.focus')){
					focusedEl = i;
				}
			});

			// reload tab
			$('#rollerTabs').tabs('url', 0, '/themeroller/rollyourown?'+ locStr);
			$('#rollerTabs').tabs('load', 0);

			// if the hash is passed
			if(newHash){ hash.updateHash(locStr, true); }

		},

		updateHash: function(locStr, ignore) {

			if(ignore == true){ hash.stopListening(); }
			window.location.hash = locStr;
			if(bookmarklet){ window.parent.location.hash = locStr; }
			if(ignore == true){
				hash.storedHash = locStr;
				hash.startListening();
			}

		},

		clean: function(locStr){
			return locStr.replace(/%23/g, "").replace(/[\?#]+/g, "");
		},

		currHash: function() {
			return hash.clean(window.location.hash);
			//return hash.clean(encodeURIComponent(window.location.hash));
		},

		currSearch: function() {
			return hash.clean(window.location.search);
			//return hash.clean(encodeURIComponent(window.location.search));
		},

		init: function(){
			hash.storedHash = '';
			hash.checkHashChange();
		}
	};

	//function to append a new theme stylesheet with the new style changes
	function updateCSS(locStr){
		$( "body" ).append( '<link href="/themeroller/parsetheme.css?' + locStr + '" type="text/css" rel="Stylesheet" />');
		if($("link[href*=parsetheme\\.css]").size() > 1){
			$("link[href*=parsetheme\\.css]:first").remove();
		}
	};

	//function called after a change event in the form
	function formChange(){
		var locStr = $('.themeroller .application form').serialize();
		locStr = hash.clean(locStr);
		updateCSS(locStr);
		hash.updateHash(locStr, true);
	};

	//set up spindowns
	$.fn.spinDown = function() {

		return this.click(function() {

			var $this = $(this);

			$this.next().slideToggle(100);
			$this.find('.icon').toggleClass('icon-triangle-1-s').end().toggleClass('state-active');

			if($this.is('.corner-all')) { $this.removeClass('corner-all').addClass('corner-top'); }
			else if($this.is('.corner-top')) { $this.removeClass('corner-top').addClass('corner-all'); }

			return false;

		});

	};

	// validation for hex inputs
	$.fn.validHex = function() {

		return this.each(function() {

			var value = $(this).val();
			value = value.replace(/[^#a-fA-F0-9]/g, ''); // non [#a-f0-9]
			value = value.toLowerCase();
			if(value.match(/#/g) && value.match(/#/g).length > 1) value = value.replace(/#/g, ''); // ##
			if(value.indexOf('#') == -1) value = '#'+value; // no #
			if(value.length > 7) value = value.substr(0,7); // too many chars

			$(this).val(value);

		});

	};

	//color pickers setup (sets bg color of inputs)
	$.fn.applyFarbtastic = function() {
		return this.each(function() {
			$('<div/>').farbtastic(this).remove();
		});
	};




	// events within the 'roll your own' tab
	function rollYourOwnBehaviors() {

		// hover class toggles in app panel
		$('li.state-default, div.state-default').hover(
			function(){ $(this).addClass('state-hover'); },
			function(){ $(this).removeClass('state-hover'); }
		);

		// hex inputs
		$('input.hex')
			.validHex()
			.keyup(function() {
				$(this).validHex();
			})
			.click(function(){
				$(this).addClass('focus');
				$('#picker').remove();
				$('div.picker-on').removeClass('picker-on');
				$('div.texturePicker ul:visible').hide(0).parent().css('position', 'static');
				$(this).after('<div id="picker"></div>').parent().addClass('picker-on');
				$('#picker').farbtastic(this);
				return false;
			})
			.wrap('<div class="hasPicker"></div>')
			.applyFarbtastic();

		// focus and blur classes in form
		$('input, select')
		.focus(function() {
			$('input.focus, select.focus').removeClass('focus');
			$(this).addClass('focus');
		})
		.blur(function() {
			$(this).removeClass('focus');
		});

		// texture pickers from select menus
		$('select.texture').each(function() {

			$(this).after('<div class="texturePicker"><a href="#"></a><ul></ul></div>');
			var texturePicker = $(this).next();
			var a = texturePicker.find('a');
			var ul = texturePicker.find('ul');
			var sIndex = texturePicker.prev().get(0).selectedIndex;

			// scrape options
			$(this).find('option').each(function(){
				ul.append('<li class="'+ $(this).attr('value') +'" data-texturewidth="'+$(this).attr('data-texturewidth')+'" data-textureheight="'+$(this).attr('data-texturewidth')+'" style="background: #555555 url(http://jqueryui.com/themeroller/images/?new=555555&w='+$(this).attr('data-texturewidth')+'&h='+$(this).attr('data-textureheight')+'&f=png&q=100&fltr[]=over|textures/'+$(this).attr('value')+'|0|0|100) 50% 50% repeat"><a href="#" title="'+ $(this).text() +'">'+ $(this).text() +'</a></li>');
				if($(this).get(0).index == sIndex){texturePicker.attr('title',$(this).text()).css('background', '#555555 url(http://jqueryui.com/themeroller/images/?new=555555&w='+$(this).attr('data-texturewidth')+'&h='+$(this).attr('data-textureheight')+'&f=png&q=60&fltr[]=over|textures/'+$(this).attr('value')+'|0|0|100) 50% 50% repeat');}
			});

			ul.find('li').click(function() {
				texturePicker.prev().get(0).selectedIndex = texturePicker.prev().find('option[value='+ $(this).attr('class').replace(/\./g, '\\.') +']').get(0).index;
				texturePicker.attr('title',$(this).text()).css('background', '#555555 url(http://jqueryui.com/themeroller/images/?new=555555&w='+$(this).attr('data-texturewidth')+'&h='+$(this).attr('data-textureheight')+'&f=png&q=60&fltr[]=over|textures/'+$(this).attr('class')+'|0|0|100)  50% 50% repeat');
				//ul.fadeOut(100);
				formChange();
				return false;
			});

			// hide the menu and select el
			ul.hide();

			// show/hide of menus
			texturePicker.click(function() {

				$(this).addClass('focus');
				$('#picker').remove();
				var showIt;
				if(ul.is(':hidden')){showIt = true;}
				$('div.texturePicker ul:visible').hide().parent().css('position', 'static');
				if(showIt == true){
					texturePicker.css('position', 'relative');
					ul.show();
				}

				return false;

			});

		});

		// spindowns in TR panel
		$('div.theme-group .theme-group-header').addClass('corner-all').spinDown();

		// change event in form
		$('.themeroller .application form').bind('change', function() {
			formChange();
			return false;
		});

		// return key triggers form change
		$.hotkeys.add('return', function () { formChange(); });

		//DL theme button
		$('#downloadTheme').click(function(){
			// FIXME shouldn't we refresh/update the href on form.change?
			// Issue: if user right clicks to copy its url, he will copy a wrong/outdated link.
			var href = $('link[href*=parsetheme\\.css]:last').attr('href');
			href = href.replace('','');
			var themeParams = escape(href.split('?')[1]);
			var themeParamName = (bookmarklet) ? 'theme' : 'themeParams';
			var straightToDownload = (bookmarklet) ? '&ui-version=1.7&download=true' : '';
			location.href = '/download?' + themeParamName + '=' + themeParams + straightToDownload;
			return false;
		});

	};


	// events within the theme gallery
	function themeGalleryBehaviors() {

		// loading and viewing gallery themes
		$('#themeGallery a')
			.bind('click', function() {
				updateCSS(hash.clean(this.href.split('?')[1]));
				hash.updateHash(hash.clean(this.href.split('?')[1]), true);
				return false;
			})
			.attr('title', 'Click to preview this theme')
			.each(function(){
				var straightToDownload = (bookmarklet) ? '&ui-version=1.7&download=true' : '';
				$(this).after(
				'<a href="/download?themeParams=' + escape( $(this).attr('href').split('?')[1] ) + straightToDownload + '" class="download" title="Download this theme">Download</a>'+
				'<a href="#" class="edit" title="Customize this theme">Edit</a>');
			})
			.parent()
			.find('a.edit')
			.click(function(){
				$(this).prev().prev().trigger('click');
				$('#rollerTabs').tabs( "select", 0 );
				return false;
			});

	};

	// dom ready event
	$(function() {

		//app tabs
		$('#rollerTabs').tabs({
			load: function(e, ui){

				rollYourOwnBehaviors();
				if(openGroups.length > 0){
					openGroups.join(','); $('.theme-group-content:eq('+openGroups+')').prev().trigger('click');
				}
				if(focusedEl){
					$('form input, form select, form .texturePicker').eq(focusedEl).click();
				}
				openGroups = [];
				focusedEl = null;

			},
			spinner: 'Loading...',
			select: function(e,ui){
				if($(ui.panel).is('#rollYourOwn')  && hash.currHash() != hash.currentTabHash){ // Stop if we actually don't have a hash change
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
		$('body').click(function() {
			$('div.picker-on').removeClass('picker-on');
			$('#picker').remove();
			$('input.focus, select.focus').removeClass('focus');
			$('div.texturePicker ul:visible').hide().parent().css('position', 'static');
		});

		//links to roll your own from help tab
		$('#help a[href="#rollYourOwn"]').click(function(){
			$('#rollerTabs').tabs( "select", 0 );
			return false;
		});

		//links to theme gallery from help tab
		$('#help a[href="#themeGallery"]').click(function(){
			$('#rollerTabs').tabs( "select", 1 );
			return false;
		});

		updateCSS();

		//start hash tracking listening
		hash.init();

	});



	/*
	 plugin resources from here down
	*/




	/******************************************************************************************************************************

	* @ Original idea by by Binny V A, Original version: 2.00.A
	* @ http://www.openjs.com/scripts/events/keyboard_shortcuts/
	* @ Original License : BSD

	* @ jQuery Plugin by Tzury Bar Yochay
	mail: tzury.by@gmail.com
	blog: evalinux.wordpress.com
	face: facebook.com/profile.php?id=513676303

	(c) Copyrights 2007

	* @ jQuery Plugin version Beta (0.0.2)
	* @ License: jQuery-License.

	TODO:
	add queue support (as in gmail) e.g. 'x' then 'y', etc.
	add mouse + mouse wheel events.

	USAGE:
	$.hotkeys.add('Ctrl+c', function(){ alert('copy anyone?');});
	$.hotkeys.add('Ctrl+c', {target:'div#editor', type:'keyup', propagate: true},function(){ alert('copy anyone?');});>
	$.hotkeys.remove('Ctrl+c');
	$.hotkeys.remove('Ctrl+c', {target:'div#editor', type:'keypress'});

	******************************************************************************************************************************/
	(function (jQuery){
	this.version = '(beta)(0.0.3)';
	this.all = {};
	this.special_keys = {
	27: 'esc', 9: 'tab', 32:'space', 13: 'return', 8:'backspace', 145: 'scroll', 20: 'capslock',
	144: 'numlock', 19:'pause', 45:'insert', 36:'home', 46:'del',35:'end', 33: 'pageup',
	34:'pagedown', 37:'left', 38:'up', 39:'right',40:'down', 112:'f1',113:'f2', 114:'f3',
	115:'f4', 116:'f5', 117:'f6', 118:'f7', 119:'f8', 120:'f9', 121:'f10', 122:'f11', 123:'f12'};

	this.shift_nums = { "`":"~", "1":"!", "2":"@", "3":"#", "4":"$", "5":"%", "6":"^", "7":"&",
	"8":"*", "9":"(", "0":")", "-":"_", "=":"+", ";":":", "'":"\"", ",":"<",
	".":">",  "/":"?",  "\\":"|" };

	this.add = function(combi, options, callback) {
	if (jQuery.isFunction(options)){
	callback = options;
	options = {};
	}
	var opt = {},
	defaults = {type: 'keydown', propagate: false, disableInInput: false, target: jQuery('html')[0], checkParent: true},
	that = this;
	opt = jQuery.extend( opt , defaults, options || {} );
	combi = combi.toLowerCase();

	// inspect if keystroke matches
	var inspector = function(event) {
	event = jQuery.event.fix(event); // jQuery event normalization.
	var element = event.target;
	// @ TextNode -> nodeType == 3
	element = (element.nodeType==3) ? element.parentNode : element;

	if(opt['disableInInput']) { // Disable shortcut keys in Input, Textarea fields
		var target = jQuery(element);
		if( target.is("input") || target.is("textarea")){
			return;
		}
	}
	var code = event.which,
		type = event.type,
		character = String.fromCharCode(code).toLowerCase(),
		special = that.special_keys[code],
		shift = event.shiftKey,
		ctrl = event.ctrlKey,
		alt= event.altKey,
		propagate = true, // default behaivour
		mapPoint = null;

	// in opera + safari, the event.target is unpredictable.
	// for example: 'keydown' might be associated with HtmlBodyElement
	// or the element where you last clicked with your mouse.
	if (jQuery.browser.opera || jQuery.browser.safari || opt.checkParent){
		while (!that.all[element] && element.parentNode){
			element = element.parentNode;
		}
	}

	var cbMap = that.all[element].events[type].callbackMap;
	if(!shift && !ctrl && !alt) { // No Modifiers
		mapPoint = cbMap[special] ||  cbMap[character];
	}
	// deals with combinaitons (alt|ctrl|shift+anything)
	else{
		var modif = '';
		if(alt) modif +='alt+';
		if(ctrl) modif+= 'ctrl+';
		if(shift) modif += 'shift+';
		// modifiers + special keys or modifiers + characters or modifiers + shift characters
		mapPoint = cbMap[modif+special] || cbMap[modif+character] || cbMap[modif+that.shift_nums[character]];
	}
	if (mapPoint){
		mapPoint.cb(event);
		if(!mapPoint.propagate) {
			event.stopPropagation();
			event.preventDefault();
			return false;
		}
	}
	};
	// first hook for this element
	if (!this.all[opt.target]){
	this.all[opt.target] = {events:{}};
	}
	if (!this.all[opt.target].events[opt.type]){
	this.all[opt.target].events[opt.type] = {callbackMap: {}};
	jQuery.event.add(opt.target, opt.type, inspector);
	}
	this.all[opt.target].events[opt.type].callbackMap[combi] =  {cb: callback, propagate:opt.propagate};
	return jQuery;
	};
	this.remove = function(exp, opt) {
	opt = opt || {};
	target = opt.target || jQuery('html')[0];
	type = opt.type || 'keydown';
	exp = exp.toLowerCase();
	delete this.all[target].events[type].callbackMap[exp];
	return jQuery;
	};
	jQuery.hotkeys = this;
	return jQuery;
	})(jQuery);







	// $Id: farbtastic.js,v 1.2 2007/01/08 22:53:01 unconed Exp $
	// Farbtastic 1.2

	jQuery.fn.farbtastic = function (callback) {
	$.farbtastic(this, callback);
	return this;
	};

	jQuery.farbtastic = function (container, callback) {
	var container = $(container).get(0);
	return container.farbtastic || (container.farbtastic = new jQuery._farbtastic(container, callback));
	};

	jQuery._farbtastic = function (container, callback) {
	// Store farbtastic object
	var fb = this;

	// Insert markup
	$(container).html('<div class="farbtastic"><div class="color"></div><div class="wheel"></div><div class="overlay"></div><div class="h-marker marker"></div><div class="sl-marker marker"></div></div>');
	var e = $('.farbtastic', container);
	fb.wheel = $('.wheel', container).get(0);
	// Dimensions
	fb.radius = 84;
	fb.square = 100;
	fb.width = 194;

	// Fix background PNGs in IE6
	if (navigator.appVersion.match(/MSIE [0-6]\./)) {
	$('*', e).each(function () {
	if (this.currentStyle.backgroundImage != 'none') {
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
	if (typeof fb.callback == 'object') {
	$(fb.callback).unbind('keyup', fb.updateValue);
	}

	// Reset color
	fb.color = null;

	// Bind callback or elements
	if (typeof callback == 'function') {
	fb.callback = callback;
	}
	else if (typeof callback == 'object' || typeof callback == 'string') {
	fb.callback = $(callback);
	fb.callback.bind('keyup', fb.updateValue);
	if (fb.callback.get(0).value) {
	fb.setColor(fb.callback.get(0).value);
	}
	}
	return this;
	};
	fb.updateValue = function (event) {
	if (this.value && this.value != fb.color) {
	fb.setColor(this.value);
	}
	};

	/**
	* Change color with HTML syntax #123456
	*/
	fb.setColor = function (color) {
	var unpack = fb.unpack(color);
	if (fb.color != color && unpack) {
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
	var x, y;
	var el = event.target || event.srcElement;
	var reference = fb.wheel;

	if (typeof event.offsetX != 'undefined') {
	// Use offset coordinates and find common offsetParent
	var pos = { x: event.offsetX, y: event.offsetY };

	// Send the coordinates upwards through the offsetParent chain.
	var e = el;
	while (e) {
	e.mouseX = pos.x;
	e.mouseY = pos.y;
	pos.x += e.offsetLeft;
	pos.y += e.offsetTop;
	e = e.offsetParent;
	};

	// Look for the coordinates starting from the wheel widget.
	var e = reference;
	var offset = { x: 0, y: 0 };
	while (e) {
	if (typeof e.mouseX != 'undefined') {
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
	var pos = fb.absolutePosition(reference);
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
	};

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
	var pos = fb.widgetCoords(event);

	// Set new HSL parameters
	if (fb.circleDrag) {
	var hue = Math.atan2(pos.x, -pos.y) / 6.28;
	if (hue < 0) hue += 1;
	fb.setHSL([hue, fb.hsl[1], fb.hsl[2]]);
	}
	else {
	var sat = Math.max(0, Math.min(1, -(pos.x / fb.square) + .5));
	var lum = Math.max(0, Math.min(1, -(pos.y / fb.square) + .5));
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
	left: Math.round(fb.square * (.5 - fb.hsl[1]) + fb.width / 2) + 'px',
	top: Math.round(fb.square * (.5 - fb.hsl[2]) + fb.width / 2) + 'px'
	});

	// Saturation/Luminance gradient
	$('.color', e).css('backgroundColor', fb.pack(fb.HSLToRGB([fb.hsl[0], 1, 0.5])));

	// Linked elements or callback
	if (typeof fb.callback == 'object') {
	// Set background/foreground color
	$(fb.callback).css({
	backgroundColor: fb.color,
	color: fb.hsl[2] > 0.5 ? '#000' : '#fff'
	});

	// Change linked value
	$(fb.callback).each(function() {
	if (this.value && this.value != fb.color) {
	this.value = fb.color;
	}
	});
	}
	else if (typeof fb.callback == 'function') {
	fb.callback.call(fb, fb.color);
	}
	};

	/**
	* Get absolute position of element
	*/
	fb.absolutePosition = function (el) {
	var r = { x: el.offsetLeft, y: el.offsetTop };
	// Resolve relative to offsetParent
	if (el.offsetParent) {
	var tmp = fb.absolutePosition(el.offsetParent);
	r.x += tmp.x;
	r.y += tmp.y;
	}
	return r;
	};

	/* Various color utility functions */
	fb.pack = function (rgb) {
	var r = Math.round(rgb[0] * 255);
	var g = Math.round(rgb[1] * 255);
	var b = Math.round(rgb[2] * 255);
	return '#' + (r < 16 ? '0' : '') + r.toString(16) +
	(g < 16 ? '0' : '') + g.toString(16) +
	(b < 16 ? '0' : '') + b.toString(16);
	};

	fb.unpack = function (color) {
	if (color.length == 7) {
	return [parseInt('0x' + color.substring(1, 3)) / 255,
	parseInt('0x' + color.substring(3, 5)) / 255,
	parseInt('0x' + color.substring(5, 7)) / 255];
	}
	else if (color.length == 4) {
	return [parseInt('0x' + color.substring(1, 2)) / 15,
	parseInt('0x' + color.substring(2, 3)) / 15,
	parseInt('0x' + color.substring(3, 4)) / 15];
	}
	};

	fb.HSLToRGB = function (hsl) {
	var m1, m2, r, g, b;
	var h = hsl[0], s = hsl[1], l = hsl[2];
	m2 = (l <= 0.5) ? l * (s + 1) : l + s - l*s;
	m1 = l * 2 - m2;
	return [this.hueToRGB(m1, m2, h+0.33333),
	this.hueToRGB(m1, m2, h),
	this.hueToRGB(m1, m2, h-0.33333)];
	};

	fb.hueToRGB = function (m1, m2, h) {
	h = (h < 0) ? h + 1 : ((h > 1) ? h - 1 : h);
	if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
	if (h * 2 < 1) return m2;
	if (h * 3 < 2) return m1 + (m2 - m1) * (0.66666 - h) * 6;
	return m1;
	};

	fb.RGBToHSL = function (rgb) {
	var min, max, delta, h, s, l;
	var r = rgb[0], g = rgb[1], b = rgb[2];
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
	if (max == r && max != g) h += (g - b) / delta;
	if (max == g && max != b) h += (2 + (b - r) / delta);
	if (max == b && max != r) h += (4 + (r - g) / delta);
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

}( jQuery ));

