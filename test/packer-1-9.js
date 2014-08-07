var Builder = require( "../lib/builder" ),
	JqueryUi = require( "../lib/jquery-ui" ),
	Packer = require( "../lib/packer" ),
	semver = require( "semver" ),
	ThemeRoller = require( "../lib/themeroller" ),
	someWidgets1 = "widget core position autocomplete button menu progressbar spinner tabs".split( " " ),
	someWidgets2 = "widget core mouse position draggable resizable button datepicker dialog slider tooltip".split( " " ),
	noComponents = [],
	invalidComponent = "invalid_widget";


function filePresent( files, filepath ) {
	var filepathRe = filepath instanceof RegExp ? filepath : new RegExp( filepath.replace( /\*/g, "[^\/]*" ).replace( /\./g, "\\." ).replace( /(.*)/, "^$1$" ) );
	return files.filter(function( build_filepath ) {
		return filepathRe.test( build_filepath );
	}).length > 0;
}

function pack( jqueryUi, components, theme, callback ) {
	var builder = new Builder( jqueryUi, components ),
		packer = new Packer( builder, theme );
	packer.pack(function( err, files ) {
		if ( err ) {
			callback( err, null );
		} else {
			callback( null, files.map(function( build_item ) {
				return build_item.path.split( "/" ).slice( 1 ).join( "/" );
			}));
		}
	});
}

function replace( variable, value ) {
	return function( filepath ) {
		if ( filepath instanceof RegExp ) {
			filepath = filepath.toString().replace(/^\//, "").replace(/\/$/, "");
			return new RegExp( filepath.replace( "\\{" + variable + "\\}", value ) );
		}
		return filepath.replace( "{" + variable + "}", value );
	};
}

function flatten( flat, arr ) {
	return flat.concat( arr );
}


var commonFiles = [
	"index.html",
	"development-bundle/AUTHORS.txt",
	"development-bundle/grunt.js",
	"development-bundle/MIT-LICENSE.txt",
	"development-bundle/package.json",
	"development-bundle/README.md",
	/development-bundle\/jquery-[^\.]*\.[^\.]*\.[^\.]*\.js/,
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
	"development-bundle/themes/base/jquery.ui.all.css",
	"development-bundle/themes/base/jquery.ui.base.css",
	"development-bundle/themes/base/jquery.ui.theme.css",
	"development-bundle/themes/base/jquery-ui.css",
	"development-bundle/themes/base/images/ui-bg_flat_0_aaaaaa_40x100.png",
	"development-bundle/themes/base/images/ui-bg_flat_75_ffffff_40x100.png",
	"development-bundle/themes/base/images/ui-bg_glass_55_fbf9ee_1x400.png",
	"development-bundle/themes/base/images/ui-bg_glass_65_ffffff_1x400.png",
	"development-bundle/themes/base/images/ui-bg_glass_75_dadada_1x400.png",
	"development-bundle/themes/base/images/ui-bg_glass_75_e6e6e6_1x400.png",
	"development-bundle/themes/base/images/ui-bg_glass_95_fef1ec_1x400.png",
	"development-bundle/themes/base/images/ui-bg_highlight-soft_75_cccccc_1x100.png",
	"development-bundle/themes/base/images/ui-icons_2e83ff_256x240.png",
	"development-bundle/themes/base/images/ui-icons_222222_256x240.png",
	"development-bundle/themes/base/images/ui-icons_454545_256x240.png",
	"development-bundle/themes/base/images/ui-icons_888888_256x240.png",
	"development-bundle/themes/base/images/ui-icons_cd0a0a_256x240.png",
	"development-bundle/themes/base/minified/jquery.ui.theme.min.css",
	"development-bundle/themes/base/minified/jquery-ui.min.css",
	"development-bundle/themes/base/minified/images/ui-bg_flat_0_aaaaaa_40x100.png",
	"development-bundle/themes/base/minified/images/ui-bg_flat_75_ffffff_40x100.png",
	"development-bundle/themes/base/minified/images/ui-bg_glass_55_fbf9ee_1x400.png",
	"development-bundle/themes/base/minified/images/ui-bg_glass_65_ffffff_1x400.png",
	"development-bundle/themes/base/minified/images/ui-bg_glass_75_dadada_1x400.png",
	"development-bundle/themes/base/minified/images/ui-bg_glass_75_e6e6e6_1x400.png",
	"development-bundle/themes/base/minified/images/ui-bg_glass_95_fef1ec_1x400.png",
	"development-bundle/themes/base/minified/images/ui-bg_highlight-soft_75_cccccc_1x100.png",
	"development-bundle/themes/base/minified/images/ui-icons_2e83ff_256x240.png",
	"development-bundle/themes/base/minified/images/ui-icons_222222_256x240.png",
	"development-bundle/themes/base/minified/images/ui-icons_454545_256x240.png",
	"development-bundle/themes/base/minified/images/ui-icons_888888_256x240.png",
	"development-bundle/themes/base/minified/images/ui-icons_cd0a0a_256x240.png",
	"development-bundle/ui/jquery-ui.custom.js",
	"development-bundle/ui/minified/jquery-ui.custom.min.js",
	/js\/jquery-[^\.]*\.[^\.]*\.[^\.]*\.js/,
	/js\/jquery-ui-[^\.]*\.[^\.]*\.[^\.]*\.custom\.js/,
	/js\/jquery-ui-[^\.]*\.[^\.]*\.[^\.]*\.custom\.min\.js/
];
var skipFiles = [
	"development-bundle/MANIFEST"
];
var COMMON_FILES_TESTCASES = commonFiles.length + skipFiles.length;
function commonFilesCheck( test, files ) {
	commonFiles.forEach(function( filepath ) {
		test.ok( filePresent( files, filepath ), "Missing a common file \"" + filepath + "\"." );
	});
	skipFiles.forEach(function( filepath ) {
		test.ok( !filePresent( files, filepath ), "Should not include \"" + filepath + "\"." );
	});
}


var componentFiles = {
	"all": [
		"development-bundle/ui.{component}.jquery.json",
		"development-bundle/ui/jquery.ui.{component}.js",
		"development-bundle/ui/minified/jquery.ui.{component}.min.js"
	],
	"widget": [
		"development-bundle/demos/widget/*",
		"development-bundle/docs/jQuery.widget.html"
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
		"development-bundle/docs/resizable.html",
		"development-bundle/themes/base/jquery.ui.resizable.css",
		"development-bundle/themes/base/minified/jquery.ui.resizable.min.css"
	],
	"selectable": [
		"development-bundle/demos/selectable/*",
		"development-bundle/docs/selectable.html",
		"development-bundle/themes/base/jquery.ui.selectable.css",
		"development-bundle/themes/base/minified/jquery.ui.selectable.min.css"
	],
	"sortable": [
		"development-bundle/demos/sortable/*",
		"development-bundle/docs/sortable.html"
	],
	"accordion": [
		"development-bundle/demos/accordion/*",
		"development-bundle/docs/accordion.html",
		"development-bundle/themes/base/jquery.ui.accordion.css",
		"development-bundle/themes/base/minified/jquery.ui.accordion.min.css"
	],
	"autocomplete": [
		"development-bundle/demos/autocomplete/*",
		"development-bundle/docs/autocomplete.html",
		"development-bundle/themes/base/jquery.ui.autocomplete.css",
		"development-bundle/themes/base/minified/jquery.ui.autocomplete.min.css"
	],
	"button": [
		"development-bundle/demos/button/*",
		"development-bundle/docs/button.html",
		"development-bundle/themes/base/jquery.ui.button.css",
		"development-bundle/themes/base/minified/jquery.ui.button.min.css"
	],
	"datepicker": [
		"development-bundle/demos/datepicker/*",
		"development-bundle/docs/datepicker.html",
		"development-bundle/themes/base/jquery.ui.datepicker.css",
		"development-bundle/themes/base/minified/jquery.ui.datepicker.min.css",
		"development-bundle/ui/i18n/*",
		"development-bundle/ui/i18n/jquery.ui.datepicker-*.js",
		"development-bundle/ui/i18n/jquery-ui-i18n.js"
	],
	"dialog": [
		"development-bundle/demos/dialog/*",
		"development-bundle/docs/dialog.html",
		"development-bundle/themes/base/jquery.ui.dialog.css",
		"development-bundle/themes/base/minified/jquery.ui.dialog.min.css"
	],
	"menu": [
		"development-bundle/demos/menu/*",
		"development-bundle/docs/menu.html",
		"development-bundle/themes/base/jquery.ui.menu.css",
		"development-bundle/themes/base/minified/jquery.ui.menu.min.css"
	],
	"progressbar": [
		"development-bundle/demos/progressbar/*",
		"development-bundle/docs/progressbar.html",
		"development-bundle/themes/base/jquery.ui.progressbar.css",
		"development-bundle/themes/base/minified/jquery.ui.progressbar.min.css"
	],
	"slider": [
		"development-bundle/demos/slider/*",
		"development-bundle/docs/slider.html",
		"development-bundle/themes/base/jquery.ui.slider.css",
		"development-bundle/themes/base/minified/jquery.ui.slider.min.css"
	],
	"spinner": [
		"development-bundle/demos/spinner/*",
		"development-bundle/docs/spinner.html",
		"development-bundle/themes/base/jquery.ui.spinner.css",
		"development-bundle/themes/base/minified/jquery.ui.spinner.min.css"
	],
	"tabs": [
		"development-bundle/demos/tabs/*",
		"development-bundle/docs/tabs.html",
		"development-bundle/themes/base/jquery.ui.tabs.css",
		"development-bundle/themes/base/minified/jquery.ui.tabs.min.css"
	],
	"tooltip": [
		"development-bundle/demos/tooltip/*",
		"development-bundle/docs/tooltip.html",
		"development-bundle/themes/base/jquery.ui.tooltip.css",
		"development-bundle/themes/base/minified/jquery.ui.tooltip.min.css"
	],
	"effect": [
		"development-bundle/demos/effect/*",
		"development-bundle/demos/addClass/*",
		"development-bundle/demos/animate/*",
		"development-bundle/demos/hide/*",
		"development-bundle/demos/removeClass/*",
		"development-bundle/demos/show/*",
		"development-bundle/demos/switchClass/*",
		"development-bundle/demos/toggle/*",
		"development-bundle/demos/toggleClass/*"
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
var COMPONENT_FILES_TESTCASES = Object.keys( componentFiles ).reduce(function( sum, component ) {
	return sum + componentFiles.all.length + componentFiles[ component ].length;
}, 0 );
function componentFilesCheck( test, files, components ) {
	Object.keys( componentFiles ).forEach(function( component ) {
		if ( components.indexOf( component ) >= 0 ) {
			componentFiles.all.map( replace( "component", component ) ).concat( componentFiles[ component ] ).forEach(function( filepath ) {
				test.ok( filePresent( files, filepath ), "Missing a \"" + component + "\" file \"" + filepath + "\"." );
			});
		} else {
			componentFiles.all.map( replace( "component", component ) ).concat( componentFiles[ component ] ).forEach(function( filepath ) {
				test.ok( !filePresent( files, filepath ), "Should not include a \"" + component + "\" file \"" + filepath + "\"." );
			});
		}
	});
}


var themeFiles = {
	"all": [
		/css\/\{folder_name\}\/jquery-ui-[^\.]*\.[^\.]*\.[^\.]*\.custom\.css/,
		/css\/\{folder_name\}\/jquery-ui-[^\.]*\.[^\.]*\.[^\.]*\.custom\.min\.css/,
		"development-bundle/themes/{folder_name}/jquery.ui.all.css",
		"development-bundle/themes/{folder_name}/jquery.ui.base.css",
		"development-bundle/themes/{folder_name}/jquery.ui.{component}.css",
		"development-bundle/themes/{folder_name}/jquery-ui.css",
		"development-bundle/themes/{folder_name}/minified/jquery.ui.{component}.min.css",
		"development-bundle/themes/{folder_name}/minified/jquery-ui.min.css"
	],
	"anyTheme": [
		"css/{folder_name}/images/*",
		"development-bundle/themes/{folder_name}/jquery.ui.theme.css",
		"development-bundle/themes/{folder_name}/images/*",
		"development-bundle/themes/{folder_name}/minified/jquery.ui.theme.min.css",
		"development-bundle/themes/{folder_name}/minified/images/*"
	]
};
var themeComponents = "accordion autocomplete button core datepicker dialog menu progressbar resizable selectable slider spinner tabs tooltip".split( " " ),
	themeComponentsRe = new RegExp( themeComponents.join( "|" ) );
function themeComponentOnly( component ) {
	return themeComponentsRe.test( component );
}
var THEME_FILES_TESTCASES = function( components ) {
	return Object.keys( themeFiles ).reduce(function( sum, group ) {
		return sum + themeFiles[ group ].reduce(function( sum, themeFile ) {
			return sum + ( (/\{component\}/).test( themeFile.toString() ) ? components.filter( themeComponentOnly ).length : 1 );
		}, 0);
	}, 0 );
};
function themeFilesCheck( test, files, components, theme ) {
	var expandComponents = function( themeFile ) {
		// For every themeFile that has a {component} variable, replicate themeFile for each component (expanding each component).
		if ( (/\{component\}/).test( themeFile.toString() ) ) {
			return components.filter( themeComponentOnly ).map(function( component ) {
				return replace( "component", component )( themeFile );
			});
		}
		return themeFile;
	};
	themeFiles.all.map( replace( "folder_name", theme.folderName() ) ).map( expandComponents ).reduce( flatten, [] ).forEach(function( filepath ) {
			test.ok( filePresent( files, filepath ), "Missing a theme file \"" + filepath + "\"." );
	});
	themeFiles.anyTheme.map( replace( "folder_name", theme.folderName() ) ).map( expandComponents ).reduce( flatten, [] ).forEach(function( filepath ) {
		if ( theme.isNull ) {
			test.ok( !filePresent( files, filepath ), "Should not include the theme file \"" + filepath + "\"." );
		} else {
			test.ok( filePresent( files, filepath ), "Missing a theme file \"" + filepath + "\"." );
		}
	});
}


var tests = {
	"test: select all components": {
		"with a theme": function( test ) {
			var components = this.allComponents,
				theme = this.theme;
			test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES + THEME_FILES_TESTCASES( components ) );
			pack( this.jqueryUi, components, theme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					componentFilesCheck( test, files, components );
					themeFilesCheck( test, files, components, theme );
					test.done();
				}
			});
		},
		"with a named theme": function( test ) {
			var components = this.allComponents,
				namedTheme = this.namedTheme;
			test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES + THEME_FILES_TESTCASES( components ) );
			pack( this.jqueryUi, components, namedTheme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					componentFilesCheck( test, files, components );
					themeFilesCheck( test, files, components, namedTheme );
					test.done();
				}
			});
		},
		"no theme": function( test ) {
			var components = this.allComponents,
				noTheme = this.noTheme;
			test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES + THEME_FILES_TESTCASES( components ) );
			pack( this.jqueryUi, components, noTheme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					componentFilesCheck( test, files, components );
					themeFilesCheck( test, files, components, noTheme );
					test.done();
				}
			});
		}
	},
	"test: select all widgets": function( test ) {
		var components = this.allWidgets;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		pack( this.jqueryUi, components, this.theme, function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
				test.done();
			} else {
				commonFilesCheck( test, files );
				componentFilesCheck( test, files, components );
				test.done();
			}
		});
	},
	"test: select all effects": function( test ) {
		var components = this.allEffects;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		pack( this.jqueryUi, components, this.theme, function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
				test.done();
			} else {
				commonFilesCheck( test, files );
				componentFilesCheck( test, files, components );
				test.done();
			}
		});
	},
	"test: select some widgets (1)": {
		"with a theme": function( test ) {
			var components = someWidgets1,
				theme = this.theme;
			test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES + THEME_FILES_TESTCASES( components ) );
			pack( this.jqueryUi, components, theme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					componentFilesCheck( test, files, components );
					themeFilesCheck( test, files, components, theme );
					test.done();
				}
			});
		},
		"with a named theme": function( test ) {
			var components = someWidgets1,
				namedTheme = this.namedTheme;
			test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES + THEME_FILES_TESTCASES( components ) );
			pack( this.jqueryUi, components, namedTheme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					componentFilesCheck( test, files, components );
					themeFilesCheck( test, files, components, namedTheme );
					test.done();
				}
			});
		},
		"no theme":
		 function( test ) {
			var components = someWidgets1,
				noTheme = this.noTheme;
			test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES + THEME_FILES_TESTCASES( components ) );
			pack( this.jqueryUi, components, noTheme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					componentFilesCheck( test, files, components );
					themeFilesCheck( test, files, components, noTheme );
					test.done();
				}
			});
		}
	},
	"test: select some widgets (2)": function( test ) {
		var components = someWidgets2;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		pack( this.jqueryUi, components, this.theme, function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
				test.done();
			} else {
				commonFilesCheck( test, files );
				componentFilesCheck( test, files, components );
				test.done();
			}
		});
	},
	"test: select no components": function( test ) {
		var components = noComponents;
		test.expect( COMMON_FILES_TESTCASES + COMPONENT_FILES_TESTCASES );
		pack( this.jqueryUi, components, this.theme, function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
				test.done();
			} else {
				commonFilesCheck( test, files );
				componentFilesCheck( test, files, components );
				test.done();
			}
		});
	},
	"test: unique files": function( test ) {
		var components = this.allComponents,
			theme = this.theme;
		test.expect( 1 );
		pack( this.jqueryUi, components, theme, function( err, files ) {
			var anyDuplicate,
				duplicates = [],
				marked = {};
			files.forEach(function( filepath ) {
				if( marked[ filepath ] ) {
					duplicates.push( filepath );
					anyDuplicate = true;
				}
				marked[ filepath ] = true;
			});
			test.ok( !anyDuplicate, "Duplicate files found:\n" + duplicates.join( ",\n" ) );
			test.done();
		});
	}
};


module.exports = {};

// Build tests for each jqueryUi release
JqueryUi.all().filter(function( jqueryUi ) {
	// Filter supported releases only
	return semver.lt( jqueryUi.pkg.version, "1.10.0" );
}).forEach(function( jqueryUi ) {
	function deepTestBuild( obj, tests ) {
		Object.keys( tests ).forEach(function( i ) {
			if ( typeof tests[ i ] === "object" ) {
				obj[ i ] = {};
				deepTestBuild( obj[ i ], tests[ i ] );
			} else {
				obj[ i ] = function( test ) {
					tests[ i ].call({
						jqueryUi: jqueryUi,
						theme: new ThemeRoller({ version: jqueryUi.pkg.version }),
						namedTheme: new ThemeRoller({
							vars: { folderName: "mytheme" },
							version: jqueryUi.pkg.version
						}),
						noTheme: new ThemeRoller({
							vars: null,
							version: jqueryUi.pkg.version
						}),
						allComponents: jqueryUi.components().map(function( component ) {
							return component.name;
						}),
						allWidgets: jqueryUi.components().filter(function( component ) {
							return component.category === "widget";
						}).map(function( component ) {
							return [ component.name ].concat( component.dependencies );
						}).reduce(function( flat, arr ) {
							return flat.concat( arr );
						}, [] ).sort().filter(function( element, i, arr ) {
							// unique
							return i === arr.indexOf( element );
						}),
						allEffects: jqueryUi.components().filter(function( component ) {
							return (/effect/).test( component.name );
						}).map(function( component ) {
							return component.name;
						})
					}, test );
				};
			}
		});
	}
	module.exports[ jqueryUi.pkg.version] = {};
	deepTestBuild( module.exports[ jqueryUi.pkg.version], tests );
});
