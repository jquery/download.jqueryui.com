var fs = require( "fs" ),
	release = require( "../lib/release" ).all()[ 0 ],
	ThemeRoller = require( "../lib/themeroller" );

var fixtures = {
	base: "" +
		"/*!\n" +
		" * jQuery UI CSS Framework 1.9.0pre\n" +
		" * http://jqueryui.com\n" +
		" *\n" +
		" * Copyright 2012 jQuery Foundation and other contributors\n" +
		" * Released under the MIT license.\n" +
		" * http://jquery.org/license\n" +
		" *\n" +
		" * http://docs.jquery.com/UI/Theming/API\n" +
		" *\n" +
		" * To view and modify this theme, visit http://jqueryui.com/themeroller/\n" +
		" */\n" +
		"\n" +
		"\n" +
		"/* Component containers\n" +
		"----------------------------------*/\n" +
		".ui-widget { font-family: Verdana,Arial,sans-serif; font-size: 1.1em; }\n" +
		".ui-widget .ui-widget { font-size: 1em; }\n" +
		".ui-widget input, .ui-widget select, .ui-widget textarea, .ui-widget button { font-family: Verdana,Arial,sans-serif; font-size: 1em; }\n" +
		".ui-widget-content { border: 1px solid #aaaaaa; background: #ffffff url(images/ui-bg_flat_75_ffffff_40x100.png) 50% 50% repeat-x; color: #222222; }\n" +
		".ui-widget-content a { color: #222222; }\n" +
		".ui-widget-header { border: 1px solid #aaaaaa; background: #cccccc url(images/ui-bg_highlight-soft_75_cccccc_1x100.png) 50% 50% repeat-x; color: #222222; font-weight: bold; }\n" +
		".ui-widget-header a { color: #222222; }\n" +
		"\n" +
		"/* Interaction states\n" +
		"----------------------------------*/\n" +
		".ui-state-default, .ui-widget-content .ui-state-default, .ui-widget-header .ui-state-default { border: 1px solid #d3d3d3; background: #e6e6e6 url(images/ui-bg_glass_75_e6e6e6_1x400.png) 50% 50% repeat-x; font-weight: normal; color: #555555; }\n" +
		".ui-state-default a, .ui-state-default a:link, .ui-state-default a:visited { color: #555555; text-decoration: none; }\n" +
		".ui-state-hover, .ui-widget-content .ui-state-hover, .ui-widget-header .ui-state-hover, .ui-state-focus, .ui-widget-content .ui-state-focus, .ui-widget-header .ui-state-focus { border: 1px solid #999999; background: #dadada url(images/ui-bg_glass_75_dadada_1x400.png) 50% 50% repeat-x; font-weight: normal; color: #212121; }\n" +
		".ui-state-hover a, .ui-state-hover a:hover { color: #212121; text-decoration: none; }\n" +
		".ui-state-active, .ui-widget-content .ui-state-active, .ui-widget-header .ui-state-active { border: 1px solid #aaaaaa; background: #ffffff url(images/ui-bg_glass_65_ffffff_1x400.png) 50% 50% repeat-x; font-weight: normal; color: #212121; }\n" +
		".ui-state-active a, .ui-state-active a:link, .ui-state-active a:visited { color: #212121; text-decoration: none; }\n" +
		".ui-widget :active { outline: none; }\n" +
		"\n" +
		"/* Interaction Cues\n" +
		"----------------------------------*/\n" +
		".ui-state-highlight, .ui-widget-content .ui-state-highlight, .ui-widget-header .ui-state-highlight  {border: 1px solid #fcefa1; background: #fbf9ee url(images/ui-bg_glass_55_fbf9ee_1x400.png) 50% 50% repeat-x; color: #363636; }\n" +
		".ui-state-highlight a, .ui-widget-content .ui-state-highlight a,.ui-widget-header .ui-state-highlight a { color: #363636; }\n" +
		".ui-state-error, .ui-widget-content .ui-state-error, .ui-widget-header .ui-state-error {border: 1px solid #cd0a0a; background: #fef1ec url(images/ui-bg_glass_95_fef1ec_1x400.png) 50% 50% repeat-x; color: #cd0a0a; }\n" +
		".ui-state-error a, .ui-widget-content .ui-state-error a, .ui-widget-header .ui-state-error a { color: #cd0a0a; }\n" +
		".ui-state-error-text, .ui-widget-content .ui-state-error-text, .ui-widget-header .ui-state-error-text { color: #cd0a0a; }\n" +
		".ui-priority-primary, .ui-widget-content .ui-priority-primary, .ui-widget-header .ui-priority-primary { font-weight: bold; }\n" +
		".ui-priority-secondary, .ui-widget-content .ui-priority-secondary,  .ui-widget-header .ui-priority-secondary { opacity: .7; filter:Alpha(Opacity=70); font-weight: normal; }\n" +
		".ui-state-disabled, .ui-widget-content .ui-state-disabled, .ui-widget-header .ui-state-disabled { opacity: .35; filter:Alpha(Opacity=35); background-image: none; }\n" +
		"\n" +
		"/* Icons\n" +
		"----------------------------------*/\n" +
		"\n" +
		"/* states and images */\n" +
		".ui-icon { width: 16px; height: 16px; background-image: url(images/ui-icons_222222_256x240.png); }\n" +
		".ui-widget-content .ui-icon {background-image: url(images/ui-icons_222222_256x240.png); }\n" +
		".ui-widget-header .ui-icon {background-image: url(images/ui-icons_222222_256x240.png); }\n" +
		".ui-state-default .ui-icon { background-image: url(images/ui-icons_888888_256x240.png); }\n" +
		".ui-state-hover .ui-icon, .ui-state-focus .ui-icon {background-image: url(images/ui-icons_454545_256x240.png); }\n" +
		".ui-state-active .ui-icon {background-image: url(images/ui-icons_454545_256x240.png); }\n" +
		".ui-state-highlight .ui-icon {background-image: url(images/ui-icons_2e83ff_256x240.png); }\n" +
		".ui-state-error .ui-icon, .ui-state-error-text .ui-icon {background-image: url(images/ui-icons_cd0a0a_256x240.png); }\n" +
		"\n" +
		"/* positioning */\n" +
		".ui-icon-carat-1-n { background-position: 0 0; }\n" +
		".ui-icon-carat-1-ne { background-position: -16px 0; }\n" +
		".ui-icon-carat-1-e { background-position: -32px 0; }\n" +
		".ui-icon-carat-1-se { background-position: -48px 0; }\n" +
		".ui-icon-carat-1-s { background-position: -64px 0; }\n" +
		".ui-icon-carat-1-sw { background-position: -80px 0; }\n" +
		".ui-icon-carat-1-w { background-position: -96px 0; }\n" +
		".ui-icon-carat-1-nw { background-position: -112px 0; }\n" +
		".ui-icon-carat-2-n-s { background-position: -128px 0; }\n" +
		".ui-icon-carat-2-e-w { background-position: -144px 0; }\n" +
		".ui-icon-triangle-1-n { background-position: 0 -16px; }\n" +
		".ui-icon-triangle-1-ne { background-position: -16px -16px; }\n" +
		".ui-icon-triangle-1-e { background-position: -32px -16px; }\n" +
		".ui-icon-triangle-1-se { background-position: -48px -16px; }\n" +
		".ui-icon-triangle-1-s { background-position: -64px -16px; }\n" +
		".ui-icon-triangle-1-sw { background-position: -80px -16px; }\n" +
		".ui-icon-triangle-1-w { background-position: -96px -16px; }\n" +
		".ui-icon-triangle-1-nw { background-position: -112px -16px; }\n" +
		".ui-icon-triangle-2-n-s { background-position: -128px -16px; }\n" +
		".ui-icon-triangle-2-e-w { background-position: -144px -16px; }\n" +
		".ui-icon-arrow-1-n { background-position: 0 -32px; }\n" +
		".ui-icon-arrow-1-ne { background-position: -16px -32px; }\n" +
		".ui-icon-arrow-1-e { background-position: -32px -32px; }\n" +
		".ui-icon-arrow-1-se { background-position: -48px -32px; }\n" +
		".ui-icon-arrow-1-s { background-position: -64px -32px; }\n" +
		".ui-icon-arrow-1-sw { background-position: -80px -32px; }\n" +
		".ui-icon-arrow-1-w { background-position: -96px -32px; }\n" +
		".ui-icon-arrow-1-nw { background-position: -112px -32px; }\n" +
		".ui-icon-arrow-2-n-s { background-position: -128px -32px; }\n" +
		".ui-icon-arrow-2-ne-sw { background-position: -144px -32px; }\n" +
		".ui-icon-arrow-2-e-w { background-position: -160px -32px; }\n" +
		".ui-icon-arrow-2-se-nw { background-position: -176px -32px; }\n" +
		".ui-icon-arrowstop-1-n { background-position: -192px -32px; }\n" +
		".ui-icon-arrowstop-1-e { background-position: -208px -32px; }\n" +
		".ui-icon-arrowstop-1-s { background-position: -224px -32px; }\n" +
		".ui-icon-arrowstop-1-w { background-position: -240px -32px; }\n" +
		".ui-icon-arrowthick-1-n { background-position: 0 -48px; }\n" +
		".ui-icon-arrowthick-1-ne { background-position: -16px -48px; }\n" +
		".ui-icon-arrowthick-1-e { background-position: -32px -48px; }\n" +
		".ui-icon-arrowthick-1-se { background-position: -48px -48px; }\n" +
		".ui-icon-arrowthick-1-s { background-position: -64px -48px; }\n" +
		".ui-icon-arrowthick-1-sw { background-position: -80px -48px; }\n" +
		".ui-icon-arrowthick-1-w { background-position: -96px -48px; }\n" +
		".ui-icon-arrowthick-1-nw { background-position: -112px -48px; }\n" +
		".ui-icon-arrowthick-2-n-s { background-position: -128px -48px; }\n" +
		".ui-icon-arrowthick-2-ne-sw { background-position: -144px -48px; }\n" +
		".ui-icon-arrowthick-2-e-w { background-position: -160px -48px; }\n" +
		".ui-icon-arrowthick-2-se-nw { background-position: -176px -48px; }\n" +
		".ui-icon-arrowthickstop-1-n { background-position: -192px -48px; }\n" +
		".ui-icon-arrowthickstop-1-e { background-position: -208px -48px; }\n" +
		".ui-icon-arrowthickstop-1-s { background-position: -224px -48px; }\n" +
		".ui-icon-arrowthickstop-1-w { background-position: -240px -48px; }\n" +
		".ui-icon-arrowreturnthick-1-w { background-position: 0 -64px; }\n" +
		".ui-icon-arrowreturnthick-1-n { background-position: -16px -64px; }\n" +
		".ui-icon-arrowreturnthick-1-e { background-position: -32px -64px; }\n" +
		".ui-icon-arrowreturnthick-1-s { background-position: -48px -64px; }\n" +
		".ui-icon-arrowreturn-1-w { background-position: -64px -64px; }\n" +
		".ui-icon-arrowreturn-1-n { background-position: -80px -64px; }\n" +
		".ui-icon-arrowreturn-1-e { background-position: -96px -64px; }\n" +
		".ui-icon-arrowreturn-1-s { background-position: -112px -64px; }\n" +
		".ui-icon-arrowrefresh-1-w { background-position: -128px -64px; }\n" +
		".ui-icon-arrowrefresh-1-n { background-position: -144px -64px; }\n" +
		".ui-icon-arrowrefresh-1-e { background-position: -160px -64px; }\n" +
		".ui-icon-arrowrefresh-1-s { background-position: -176px -64px; }\n" +
		".ui-icon-arrow-4 { background-position: 0 -80px; }\n" +
		".ui-icon-arrow-4-diag { background-position: -16px -80px; }\n" +
		".ui-icon-extlink { background-position: -32px -80px; }\n" +
		".ui-icon-newwin { background-position: -48px -80px; }\n" +
		".ui-icon-refresh { background-position: -64px -80px; }\n" +
		".ui-icon-shuffle { background-position: -80px -80px; }\n" +
		".ui-icon-transfer-e-w { background-position: -96px -80px; }\n" +
		".ui-icon-transferthick-e-w { background-position: -112px -80px; }\n" +
		".ui-icon-folder-collapsed { background-position: 0 -96px; }\n" +
		".ui-icon-folder-open { background-position: -16px -96px; }\n" +
		".ui-icon-document { background-position: -32px -96px; }\n" +
		".ui-icon-document-b { background-position: -48px -96px; }\n" +
		".ui-icon-note { background-position: -64px -96px; }\n" +
		".ui-icon-mail-closed { background-position: -80px -96px; }\n" +
		".ui-icon-mail-open { background-position: -96px -96px; }\n" +
		".ui-icon-suitcase { background-position: -112px -96px; }\n" +
		".ui-icon-comment { background-position: -128px -96px; }\n" +
		".ui-icon-person { background-position: -144px -96px; }\n" +
		".ui-icon-print { background-position: -160px -96px; }\n" +
		".ui-icon-trash { background-position: -176px -96px; }\n" +
		".ui-icon-locked { background-position: -192px -96px; }\n" +
		".ui-icon-unlocked { background-position: -208px -96px; }\n" +
		".ui-icon-bookmark { background-position: -224px -96px; }\n" +
		".ui-icon-tag { background-position: -240px -96px; }\n" +
		".ui-icon-home { background-position: 0 -112px; }\n" +
		".ui-icon-flag { background-position: -16px -112px; }\n" +
		".ui-icon-calendar { background-position: -32px -112px; }\n" +
		".ui-icon-cart { background-position: -48px -112px; }\n" +
		".ui-icon-pencil { background-position: -64px -112px; }\n" +
		".ui-icon-clock { background-position: -80px -112px; }\n" +
		".ui-icon-disk { background-position: -96px -112px; }\n" +
		".ui-icon-calculator { background-position: -112px -112px; }\n" +
		".ui-icon-zoomin { background-position: -128px -112px; }\n" +
		".ui-icon-zoomout { background-position: -144px -112px; }\n" +
		".ui-icon-search { background-position: -160px -112px; }\n" +
		".ui-icon-wrench { background-position: -176px -112px; }\n" +
		".ui-icon-gear { background-position: -192px -112px; }\n" +
		".ui-icon-heart { background-position: -208px -112px; }\n" +
		".ui-icon-star { background-position: -224px -112px; }\n" +
		".ui-icon-link { background-position: -240px -112px; }\n" +
		".ui-icon-cancel { background-position: 0 -128px; }\n" +
		".ui-icon-plus { background-position: -16px -128px; }\n" +
		".ui-icon-plusthick { background-position: -32px -128px; }\n" +
		".ui-icon-minus { background-position: -48px -128px; }\n" +
		".ui-icon-minusthick { background-position: -64px -128px; }\n" +
		".ui-icon-close { background-position: -80px -128px; }\n" +
		".ui-icon-closethick { background-position: -96px -128px; }\n" +
		".ui-icon-key { background-position: -112px -128px; }\n" +
		".ui-icon-lightbulb { background-position: -128px -128px; }\n" +
		".ui-icon-scissors { background-position: -144px -128px; }\n" +
		".ui-icon-clipboard { background-position: -160px -128px; }\n" +
		".ui-icon-copy { background-position: -176px -128px; }\n" +
		".ui-icon-contact { background-position: -192px -128px; }\n" +
		".ui-icon-image { background-position: -208px -128px; }\n" +
		".ui-icon-video { background-position: -224px -128px; }\n" +
		".ui-icon-script { background-position: -240px -128px; }\n" +
		".ui-icon-alert { background-position: 0 -144px; }\n" +
		".ui-icon-info { background-position: -16px -144px; }\n" +
		".ui-icon-notice { background-position: -32px -144px; }\n" +
		".ui-icon-help { background-position: -48px -144px; }\n" +
		".ui-icon-check { background-position: -64px -144px; }\n" +
		".ui-icon-bullet { background-position: -80px -144px; }\n" +
		".ui-icon-radio-on { background-position: -96px -144px; }\n" +
		".ui-icon-radio-off { background-position: -112px -144px; }\n" +
		".ui-icon-pin-w { background-position: -128px -144px; }\n" +
		".ui-icon-pin-s { background-position: -144px -144px; }\n" +
		".ui-icon-play { background-position: 0 -160px; }\n" +
		".ui-icon-pause { background-position: -16px -160px; }\n" +
		".ui-icon-seek-next { background-position: -32px -160px; }\n" +
		".ui-icon-seek-prev { background-position: -48px -160px; }\n" +
		".ui-icon-seek-end { background-position: -64px -160px; }\n" +
		".ui-icon-seek-start { background-position: -80px -160px; }\n" +
		"/* ui-icon-seek-first is deprecated, use ui-icon-seek-start instead */\n" +
		".ui-icon-seek-first { background-position: -80px -160px; }\n" +
		".ui-icon-stop { background-position: -96px -160px; }\n" +
		".ui-icon-eject { background-position: -112px -160px; }\n" +
		".ui-icon-volume-off { background-position: -128px -160px; }\n" +
		".ui-icon-volume-on { background-position: -144px -160px; }\n" +
		".ui-icon-power { background-position: 0 -176px; }\n" +
		".ui-icon-signal-diag { background-position: -16px -176px; }\n" +
		".ui-icon-signal { background-position: -32px -176px; }\n" +
		".ui-icon-battery-0 { background-position: -48px -176px; }\n" +
		".ui-icon-battery-1 { background-position: -64px -176px; }\n" +
		".ui-icon-battery-2 { background-position: -80px -176px; }\n" +
		".ui-icon-battery-3 { background-position: -96px -176px; }\n" +
		".ui-icon-circle-plus { background-position: 0 -192px; }\n" +
		".ui-icon-circle-minus { background-position: -16px -192px; }\n" +
		".ui-icon-circle-close { background-position: -32px -192px; }\n" +
		".ui-icon-circle-triangle-e { background-position: -48px -192px; }\n" +
		".ui-icon-circle-triangle-s { background-position: -64px -192px; }\n" +
		".ui-icon-circle-triangle-w { background-position: -80px -192px; }\n" +
		".ui-icon-circle-triangle-n { background-position: -96px -192px; }\n" +
		".ui-icon-circle-arrow-e { background-position: -112px -192px; }\n" +
		".ui-icon-circle-arrow-s { background-position: -128px -192px; }\n" +
		".ui-icon-circle-arrow-w { background-position: -144px -192px; }\n" +
		".ui-icon-circle-arrow-n { background-position: -160px -192px; }\n" +
		".ui-icon-circle-zoomin { background-position: -176px -192px; }\n" +
		".ui-icon-circle-zoomout { background-position: -192px -192px; }\n" +
		".ui-icon-circle-check { background-position: -208px -192px; }\n" +
		".ui-icon-circlesmall-plus { background-position: 0 -208px; }\n" +
		".ui-icon-circlesmall-minus { background-position: -16px -208px; }\n" +
		".ui-icon-circlesmall-close { background-position: -32px -208px; }\n" +
		".ui-icon-squaresmall-plus { background-position: -48px -208px; }\n" +
		".ui-icon-squaresmall-minus { background-position: -64px -208px; }\n" +
		".ui-icon-squaresmall-close { background-position: -80px -208px; }\n" +
		".ui-icon-grip-dotted-vertical { background-position: 0 -224px; }\n" +
		".ui-icon-grip-dotted-horizontal { background-position: -16px -224px; }\n" +
		".ui-icon-grip-solid-vertical { background-position: -32px -224px; }\n" +
		".ui-icon-grip-solid-horizontal { background-position: -48px -224px; }\n" +
		".ui-icon-gripsmall-diagonal-se { background-position: -64px -224px; }\n" +
		".ui-icon-grip-diagonal-se { background-position: -80px -224px; }\n" +
		"\n" +
		"\n" +
		"/* Misc visuals\n" +
		"----------------------------------*/\n" +
		"\n" +
		"/* Corner radius */\n" +
		".ui-corner-all, .ui-corner-top, .ui-corner-left, .ui-corner-tl { -moz-border-radius-topleft: 4px; -webkit-border-top-left-radius: 4px; -khtml-border-top-left-radius: 4px; border-top-left-radius: 4px; }\n" +
		".ui-corner-all, .ui-corner-top, .ui-corner-right, .ui-corner-tr { -moz-border-radius-topright: 4px; -webkit-border-top-right-radius: 4px; -khtml-border-top-right-radius: 4px; border-top-right-radius: 4px; }\n" +
		".ui-corner-all, .ui-corner-bottom, .ui-corner-left, .ui-corner-bl { -moz-border-radius-bottomleft: 4px; -webkit-border-bottom-left-radius: 4px; -khtml-border-bottom-left-radius: 4px; border-bottom-left-radius: 4px; }\n" +
		".ui-corner-all, .ui-corner-bottom, .ui-corner-right, .ui-corner-br { -moz-border-radius-bottomright: 4px; -webkit-border-bottom-right-radius: 4px; -khtml-border-bottom-right-radius: 4px; border-bottom-right-radius: 4px; }\n" +
		"\n" +
		"/* Overlays */\n" +
		".ui-widget-overlay { background: #aaaaaa url(images/ui-bg_flat_0_aaaaaa_40x100.png) 50% 50% repeat-x; opacity: .3;filter:Alpha(Opacity=30); }\n" +
		".ui-widget-shadow { margin: -8px 0 0 -8px; padding: 8px; background: #aaaaaa url(images/ui-bg_flat_0_aaaaaa_40x100.png) 50% 50% repeat-x; opacity: .3;filter:Alpha(Opacity=30); -moz-border-radius: 8px; -khtml-border-radius: 8px; -webkit-border-radius: 8px; border-radius: 8px; }"
};

var defaultTheme = new ThemeRoller();

module.exports = {
	"test: base theme": function( test ) {
		test.ok( fixtures.base == defaultTheme.css(), "Base theme is wrong" );
		test.done();
	},

	"test: folder name": {
		"default \"custom-theme\"": function( test ) {
			test.ok( defaultTheme.folderName() == "custom-theme", "Default folder name \"" + defaultTheme.folderName() + "\" is different from \"custom-theme\"" );
			test.done();
		},

		"default when theme is null \"no-theme\"": function( test ) {
			var theme = new ThemeRoller( null );
			test.ok( theme.folderName() == "no-theme", "Default folder name \"" + theme.folderName() + "\" is different from \"no-theme\"" );
			test.done();
		},

		"custom folder name based on theme's name": function( test ) {
			var theme = new ThemeRoller({
				name: "My Name"
			});
			test.ok( theme.folderName() == "my-name", "Folder name \"my-name\" expected, but got \"" + theme.folderName() + "\"" );
			test.done();
		},

		"custom folder name": function( test ) {
			var theme = new ThemeRoller({
				folderName: "my-name"
			});
			test.ok( theme.folderName() == "my-name", "Folder name \"my-name\" expected, but got \"" + theme.folderName() + "\"" );
			test.done();
		}
	}
};
