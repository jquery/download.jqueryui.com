var Builder = require( "../build-backend" ),
	allComponents = "widget core mouse position draggable droppable resizable selectable sortable accordion autocomplete button datepicker dialog menu progressbar slider spinner tabs tooltip effect effect-blind effect-bounce effect-clip effect-drop effect-explode effect-fade effect-fold effect-highlight effect-pulsate effect-scale effect-shake effect-slide effect-transfer".split( " " ),
	allWidgets = "widget core mouse position draggable resizable accordion autocomplete button datepicker dialog menu progressbar slider spinner tabs tooltip".split( " " ),
	allEffects = "effect effect-blind effect-bounce effect-clip effect-drop effect-explode effect-fade effect-fold effect-highlight effect-pulsate effect-scale effect-shake effect-slide effect-transfer".split( " " ),
	someWidgets1 = "widget core position autocomplete button menu progressbar spinner tabs".split( " " ),
	someWidgets2 = "widget core mouse position draggable resizable button datepicker dialog slider tooltip".split( " " );


function filePresent( build, filepath ) {
	var filepathRe = new RegExp( filepath.replace( /\*/g, "[^\/]*" ).replace( /\./g, "\\." ).replace( /(.*)/, "^$1$" ) );
	return build.filter(function( build_filepath ) {
		return filepathRe.test( build_filepath );
	}).length > 0;
}

function build( components, callback ) {
	var builder = new Builder( components );
	builder.build(function( build ) {
		callback( build.map(function( build_item ) {
			return build_item.path.split( "/" ).slice( 1 ).join( "/" );
		} ) );
	});
}


var commonFiles = [
	"index.html",
	"development-bundle/AUTHORS.txt",
	"development-bundle/MIT-LICENSE.txt",
	"development-bundle/jquery-*.*.*.js",
	"development-bundle/package.json",
	"development-bundle/demos/demos.css",
	"development-bundle/demos/images/demo-spindown-open.gif",
	"development-bundle/demos/images/pbar-ani.gif",
	"development-bundle/demos/images/demo-config-on-tile.gif",
	"development-bundle/demos/images/icon-docs-info.gif",
	"development-bundle/demos/images/demo-spindown-closed.gif",
	"development-bundle/demos/images/demo-config-on.gif",
	"development-bundle/demos/images/calendar.gif",
	"development-bundle/external/globalize.culture.de-DE.js",
	"development-bundle/external/globalize.culture.ja-JP.js",
	"development-bundle/external/globalize.js",
	"development-bundle/external/jquery.bgiframe-2.1.2.js",
	"development-bundle/external/jquery.cookie.js",
	"development-bundle/external/jquery.metadata.js",
	"development-bundle/external/jquery.mousewheel.js",
	"development-bundle/external/jshint.js",
	"development-bundle/external/qunit.css",
	"development-bundle/ui/jquery-ui-*.*.*.custom.js",
	"development-bundle/ui/minified/jquery-ui-*.*.*.custom.min.js",
	"js/jquery-*.*.*.js",
	"js/jquery-*.*.*.min.js",
	"js/jquery-*.*.*.custom.js",
	"js/jquery-*.*.*.custom.min.js",
	"css/base/jquery-ui-*.*.*.custom.css",
	"css/base/jquery-ui-*.*.*.custom.min.css",
	"css/base/images/ui-bg_glass_95_fef1ec_1x400.png",
	"css/base/images/ui-icons_222222_256x240.png",
	"css/base/images/ui-icons_454545_256x240.png",
	"css/base/images/ui-bg_highlight-soft_75_cccccc_1x100.png",
	"css/base/images/ui-bg_glass_75_e6e6e6_1x400.png",
	"css/base/images/ui-bg_flat_0_aaaaaa_40x100.png",
	"css/base/images/ui-icons_888888_256x240.png",
	"css/base/images/ui-bg_glass_65_ffffff_1x400.png",
	"css/base/images/ui-bg_glass_55_fbf9ee_1x400.png",
	"css/base/images/ui-icons_2e83ff_256x240.png",
	"css/base/images/ui-icons_cd0a0a_256x240.png",
	"css/base/images/ui-bg_flat_75_ffffff_40x100.png",
	"css/base/images/ui-bg_glass_75_dadada_1x400.png"
];
var skipFiles = [
	"development-bundle/demos/index.html",
	"development-bundle/MANIFEST"
];
var COMMON_FILES_TESTCASES = commonFiles.length + skipFiles.length;
function commonFilesCheck( test, build ) {
	commonFiles.forEach(function( filepath ) {
		test.ok( filePresent( build, filepath ), "Missing a common file \"" + filepath + "\"." );
	});
	skipFiles.forEach(function( filepath ) {
		test.ok( !filePresent( build, filepath ), "Should not include \"" + filepath + "\"." );
	});
}


componentFiles = {
	"all": [
		"development-bundle/ui.{component}.jquery.json",
		"development-bundle/ui/jquery.ui.{component}.js",
		"development-bundle/ui/minified/jquery.ui.{component}.min.js"
	],
	"widget": [
		"development-bundle/demos/widget/*",
		"development-bundle/docs/widget.html"
	],
	"core": [],
	"mouse": [],
	"position": [
		"development-bundle/demos/position/*",
		"development-bundle/docs/position.html"
	],
	"draggable": [
		"development-bundle/demos/draggable/*",
		"development-bundle/docs/draggable.html"
	],
	"droppable": [
		"development-bundle/demos/droppable/*",
		"development-bundle/docs/droppable.html"
	],
	"resizable": [
		"development-bundle/demos/resizable/*",
		"development-bundle/docs/resizable.html"
	],
	"selectable": [
		"development-bundle/demos/selectable/*",
		"development-bundle/docs/selectable.html"
	],
	"sortable": [
		"development-bundle/demos/sortable/*",
		"development-bundle/docs/sortable.html"
	],
	"accordion": [
		"development-bundle/demos/accordion/*",
		"development-bundle/docs/accordion.html"
	],
	"autocomplete": [
		"development-bundle/demos/autocomplete/*",
		"development-bundle/docs/autocomplete.html"
	],
	"button": [
		"development-bundle/demos/button/*",
		"development-bundle/docs/button.html"
	],
	"datepicker": [
		"development-bundle/ui/i18n/*",
		"development-bundle/ui/i18n/jquery-ui-i18n.js",
		"development-bundle/ui/i18n/jquery.ui.datepicker-*.js",
		"development-bundle/demos/datepicker/*",
		"development-bundle/docs/datepicker.html"
	],
	"dialog": [
		"development-bundle/demos/dialog/*",
		"development-bundle/docs/dialog.html"
	],
	"menu": [
		"development-bundle/demos/menu/*",
		"development-bundle/docs/menu.html"
	],
	"progressbar": [
		"development-bundle/demos/progressbar/*",
		"development-bundle/docs/progressbar.html"
	],
	"slider": [
		"development-bundle/demos/slider/*",
		"development-bundle/docs/slider.html"
	],
	"spinner": [
		"development-bundle/demos/spinner/*",
		"development-bundle/docs/spinner.html"
	],
	"tabs": [
		"development-bundle/demos/tabs/*",
		"development-bundle/docs/tabs.html"
	],
	"tooltip": [
		"development-bundle/demos/tooltip/*",
		"development-bundle/docs/tooltip.html"
	],
	"effect": [
		"development-bundle/demos/effect/*"
	],
	"effect-blind": [
		"development-bundle/docs/blind-effect.html"
	],
	"effect-bounce": [
		"development-bundle/docs/bounce-effect.html"
	],
	"effect-clip": [
		"development-bundle/docs/clip-effect.html"
	],
	"effect-drop": [
		"development-bundle/docs/drop-effect.html"
	],
	"effect-explode": [
		"development-bundle/docs/explode-effect.html"
	],
	"effect-fade": [
		"development-bundle/docs/fade-effect.html"
	],
	"effect-fold": [
		"development-bundle/docs/fold-effect.html"
	],
	"effect-highlight": [
		"development-bundle/docs/highlight-effect.html"
	],
	"effect-pulsate": [
		"development-bundle/docs/pulsate-effect.html"
	],
	"effect-scale": [
		"development-bundle/docs/puff-effect.html",
		"development-bundle/docs/scale-effect.html",
		"development-bundle/docs/size-effect.html"
	],
	"effect-shake": [
		"development-bundle/docs/shake-effect.html"
	],
	"effect-slide": [
		"development-bundle/docs/slide-effect.html"
	],
	"effect-transfer": [
		"development-bundle/docs/transfer-effect.html"
	]
};
var COMPONENT_FILES_TESTCASES = Object.keys( componentFiles ).reduce(function(
sum, component ) {
	return sum + componentFiles.all.length + componentFiles[ component ].length;
}, 0 );
function replaceComponent( component ) {
	return function( filepath ) {
		return filepath.replace( "{component}", component );
	};
}
function componentFilesCheck( test, build, components ) {
	Object.keys( componentFiles ).forEach(function( component ) {
		if ( components.indexOf( component ) >= 0 ) {
			componentFiles.all.map( replaceComponent( component ) ).concat( componentFiles[ component ] ).forEach(function( filepath ) {
				test.ok( filePresent( build, filepath ), "Missing a \"" + component + "\" file \"" + filepath + "\"." );
			});
		} else {
			componentFiles.all.map( replaceComponent( component ) ).concat( componentFiles[ component ] ).forEach(function( filepath ) {
				test.ok( !filePresent( build, filepath ), "Should not include a \"" + component + "\" file \"" + filepath + "\"." );
			});
		}
	});
}


module.exports = {
	"test: select all components": function( test ) {
		var components = allComponents;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		build( components, function( build ) {
			commonFilesCheck( test, build );
			componentFilesCheck( test, build, components );
			test.done();
		});
	},
	"test: select all widgets": function( test ) {
		var components = allWidgets;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		build( components, function( build ) {
			commonFilesCheck( test, build );
			componentFilesCheck( test, build, components );
			test.done();
		});
	},
	"test: select all effects": function( test ) {
		var components = allEffects;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		build( components, function( build ) {
			commonFilesCheck( test, build );
			componentFilesCheck( test, build, components );
			test.done();
		});
	},
	"test: select some widgets (1)": function( test ) {
		var components = someWidgets1;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		build( components, function( build ) {
			commonFilesCheck( test, build );
			componentFilesCheck( test, build, components );
			test.done();
		});
	},
	"test: select some widgets (2)": function( test ) {
		var components = someWidgets2;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		build( components, function( build ) {
			commonFilesCheck( test, build );
			componentFilesCheck( test, build, components );
			test.done();
		});
	}
};
