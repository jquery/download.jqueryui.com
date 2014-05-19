var JqueryUi = require( "../lib/jquery-ui" ),
	semver = require( "semver" );

function notNull( data ) {
	if ( data instanceof Buffer ) {
		data = data.toString( "utf-8" );
	}
	if ( typeof data === "string" && data.length > 0 ) {
		return true;
	}
	return false;
}

var tests = {
	"test: common files present": function( test ) {
		var files = this.jqueryUi.files();
		test.expect( files.commonFiles.length );
		files.commonFiles.forEach(function( file ) {
			test.ok( notNull( file.data ), "Null file \"" + file.path + "\"." );
		});
		test.done();
	},
	"test: component files present": function( test ) {
		var files = this.jqueryUi.files();
		test.expect( files.componentFiles.length );
		files.componentFiles.forEach(function( file ) {
			test.ok( notNull( file.data ), "Null file \"" + file.path + "\"." );
		});
		test.done();
	},
	"test: demo files present": function( test ) {
		var files = this.jqueryUi.files();
		test.expect( files.demoFiles.length );
		files.demoFiles.forEach(function( file ) {
			test.ok( notNull( file.data ), "Null file \"" + file.path + "\"." );
		});
		test.done();
	},
	"test: doc files present": function( test ) {
		var files = this.jqueryUi.files();
		test.expect( files.docFiles.length );
		files.docFiles.forEach(function( file ) {
			test.ok( notNull( file.data ), "Null file \"" + file.path + "\"." );
		});
		test.done();
	},
	"test: base theme files present": function( test ) {
		var files = this.jqueryUi.files();
		test.expect( files.baseThemeFiles.length );
		files.baseThemeFiles.forEach(function( file ) {
			test.ok( notNull( file.data ), "Null file \"" + file.path + "\"." );
		});
		test.done();
	}
};

module.exports = {};

// Build tests for each jqueryUi release
JqueryUi.all().filter(function(jqueryUi) {
	// Filter supported releases only
	return semver.lt( jqueryUi.pkg.version, "1.11.0-a" );
}).forEach(function( jqueryUi ) {
	function deepTestBuild( obj, tests ) {
		Object.keys( tests ).forEach(function( i ) {
			if ( typeof tests[ i ] === "object" ) {
				obj[ i ] = {};
				deepTestBuild( obj[ i ], tests[ i ] );
			} else {
				obj[ i ] = function( test ) {
					tests[ i ].call({
						jqueryUi: jqueryUi
					}, test );
				};
			}
		});
	}
	module.exports[ jqueryUi.pkg.version ] = {};
	deepTestBuild( module.exports[ jqueryUi.pkg.version ], tests );
});
