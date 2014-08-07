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

function flatten( flat, arr ) {
	return flat.concat( arr );
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

var commonFiles = [
	"external/jquery/jquery.js",
	"jquery-ui.js",
	"jquery-ui.min.js"
];
var COMMON_FILES_TESTCASES = commonFiles.length;
function commonFilesCheck( test, files ) {
	commonFiles.forEach(function( filepath ) {
		test.ok( filePresent( files, filepath ), "Missing a common file \"" + filepath + "\"." );
	});
}


var themeFiles = {
	"all": [
		"jquery-ui.css",
		"jquery-ui.min.css",
		"jquery-ui.structure.css",
		"jquery-ui.structure.min.css"
	],
	"anyTheme": [
		"jquery-ui.theme.css",
		"jquery-ui.theme.min.css",
		"images/animated-overlay.gif",
		"images/ui-icons*png",
		"images/ui-bg*png"
	]
};
var themeComponents = "accordion autocomplete button core datepicker dialog menu progressbar resizable selectable slider spinner tabs tooltip".split( " " );
var THEME_FILES_TESTCASES = function() {
	return Object.keys( themeFiles ).reduce(function( sum, group ) {
		return sum + themeFiles[ group ].length;
	}, 0 );
};
function themeFilesCheck( test, files, components, theme ) {
	themeFiles.all.reduce( flatten, [] ).forEach(function( filepath ) {
			test.ok( filePresent( files, filepath ), "Missing a theme file \"" + filepath + "\"." );
	});
	themeFiles.anyTheme.reduce( flatten, [] ).forEach(function( filepath ) {
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
			test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES() );
			pack( this.jqueryUi, components, theme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					themeFilesCheck( test, files, components, theme );
					test.done();
				}
			});
		},
		"with a named theme": function( test ) {
			var components = this.allComponents,
				namedTheme = this.namedTheme;
			test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES() );
			pack( this.jqueryUi, components, namedTheme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					themeFilesCheck( test, files, components, namedTheme );
					test.done();
				}
			});
		},
		"no theme": function( test ) {
			var components = this.allComponents,
				noTheme = this.noTheme;
			test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES() );
			pack( this.jqueryUi, components, noTheme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					themeFilesCheck( test, files, components, noTheme );
					test.done();
				}
			});
		}
	},
	"test: select all widgets": function( test ) {
		var components = this.allWidgets;
		test.expect( COMMON_FILES_TESTCASES );
		pack( this.jqueryUi, components, this.theme, function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
				test.done();
			} else {
				commonFilesCheck( test, files );
				test.done();
			}
		});
	},
	"test: select all effects": function( test ) {
		var components = this.allEffects;
		test.expect( COMMON_FILES_TESTCASES );
		pack( this.jqueryUi, components, this.theme, function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
				test.done();
			} else {
				commonFilesCheck( test, files );
				test.done();
			}
		});
	},
	"test: select some widgets (1)": {
		"with a theme": function( test ) {
			var components = someWidgets1,
				theme = this.theme;
			test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES() );
			pack( this.jqueryUi, components, theme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					themeFilesCheck( test, files, components, theme );
					test.done();
				}
			});
		},
		"with a named theme": function( test ) {
			var components = someWidgets1,
				namedTheme = this.namedTheme;
			test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES() );
			pack( this.jqueryUi, components, namedTheme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					themeFilesCheck( test, files, components, namedTheme );
					test.done();
				}
			});
		},
		"no theme":
		 function( test ) {
			var components = someWidgets1,
				noTheme = this.noTheme;
			test.expect( COMMON_FILES_TESTCASES + THEME_FILES_TESTCASES() );
			pack( this.jqueryUi, components, noTheme, function( err, files ) {
				if ( err ) {
					test.ok( false, err.message );
					test.done();
				} else {
					commonFilesCheck( test, files );
					themeFilesCheck( test, files, components, noTheme );
					test.done();
				}
			});
		}
	},
	"test: select some widgets (2)": function( test ) {
		var components = someWidgets2;
		test.expect( COMMON_FILES_TESTCASES );
		pack( this.jqueryUi, components, this.theme, function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
				test.done();
			} else {
				commonFilesCheck( test, files );
				test.done();
			}
		});
	},
	"test: select no components": function( test ) {
		var components = noComponents;
		test.expect( COMMON_FILES_TESTCASES );
		pack( this.jqueryUi, components, this.theme, function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
				test.done();
			} else {
				commonFilesCheck( test, files );
				test.done();
			}
		});
	},
	"test: scope widget CSS": function( test ) {
		var builder, packer,
			components = [ "core", "widget", "tabs" ],
			filesToCheck = [
				/jquery-ui\.css/,
				/jquery-ui\.min\.css/
			],
			scope = "#wrapper";
		test.expect( filesToCheck.length );
		builder = new Builder( this.jqueryUi, components, { scope: scope } );
		packer = new Packer( builder, this.theme, { scope: scope } );
		packer.pack(function( err, files ) {
			if ( err ) {
				test.ok( false, err.message );
			} else {
				files.filter(function( file ) {
					return filesToCheck.some(function( filepath ) {
						return filepath.test( file.path );
					});
				}).forEach(function( file ) {
					test.ok( (new RegExp( scope )).test( file.data ), "Builder should scope any other-than-theme CSS. But, failed to scope \"" + file.path + "\"." );
				});
			}
			test.done();
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
	return semver.lt( jqueryUi.pkg.version, "1.11.1-a" ) && semver.gte( jqueryUi.pkg.version, "1.11.0-a" );
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
	module.exports[ jqueryUi.pkg.version ] = {};
	deepTestBuild( module.exports[ jqueryUi.pkg.version ], tests );
});
