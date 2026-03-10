"use strict";

const fs = require( "node:fs" );
const async = require( "async" );
const amdCssBuilder = require( "../lib/builder-amd-css" );

QUnit.module( "builder-amd-css" );

const files = {
	"foo.js": fs.readFileSync( __dirname +
		"/fixtures/builder-amd-css/basic/foo.js" ),
	"bar.js": fs.readFileSync( __dirname +
		"/fixtures/builder-amd-css/basic/bar.js" ),
	"foo.css": fs.readFileSync( __dirname +
		"/fixtures/builder-amd-css/basic/foo.css" ),
	"bar.css": fs.readFileSync( __dirname +
		"/fixtures/builder-amd-css/basic/bar.css" )
};

QUnit.test( "CSS dependencies of a JS file", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	amdCssBuilder( files, { include: [ "bar" ] }, function( error, css ) {
		if ( error ) {
			assert.ok( false, "amd css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( css, ".bar {}\n", "includes CSS dependencies" );

		done();
	} );
} );

QUnit.test( "CSS dependencies of JS dependencies", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	amdCssBuilder( files, { include: [ "foo" ] }, function( error, css ) {
		if ( error ) {
			assert.ok( false, "amd css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( css, ".foo {}\n.bar {}\n",
			"includes CSS dependencies of JS dependencies" );

		done();
	} );
} );

QUnit.test( "Using appDir", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	const files = {
		"fixtures/foo.js": fs.readFileSync( __dirname +
			"/fixtures/builder-amd-css/basic/foo.js" ),
		"fixtures/bar.js": fs.readFileSync( __dirname +
			"/fixtures/builder-amd-css/basic/bar.js" ),
		"fixtures/foo.css": fs.readFileSync( __dirname +
			"/fixtures/builder-amd-css/basic/foo.css" ),
		"fixtures/bar.css": fs.readFileSync( __dirname +
			"/fixtures/builder-amd-css/basic/bar.css" )
	};

	amdCssBuilder( files, { appDir: "fixtures", include: [ "foo" ] }, function( error, css ) {
		if ( error ) {
			assert.ok( false, "amd css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( css, ".foo {}\n.bar {}\n", "respects appDir" );

		done();
	} );

} );

QUnit.test( "Using appDir plus CSSes in a sibling subdir", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	const files = {
		"a/foo.js": fs.readFileSync( __dirname +
			"/fixtures/builder-amd-css/css-elsewhere/a/foo.js" ),
		"a/bar.js": fs.readFileSync( __dirname +
			"/fixtures/builder-amd-css/css-elsewhere/a/bar.js" ),
		"b/foo.css": fs.readFileSync( __dirname +
			"/fixtures/builder-amd-css/css-elsewhere/b/foo.css" ),
		"b/bar.css": fs.readFileSync( __dirname +
			"/fixtures/builder-amd-css/css-elsewhere/b/bar.css" )
	};

	amdCssBuilder( files, { appDir: "a", include: [ "foo" ] }, function( error, css ) {
		if ( error ) {
			assert.ok( false, "amd css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( css, ".foo {}\n.bar {}\n",
			"resolves CSSes from a sibling subdir" );

		done();
	} );

} );

QUnit.test( "Serial runs", function( assert ) {
	assert.expect( 2 );

	const done = assert.async();

	async.series( [
		function( callback ) {
			amdCssBuilder( files, { include: [ "bar" ] }, callback );
		},
		function( callback ) {
			amdCssBuilder( files, { include: [ "foo" ] }, callback );
		}
	], function( error, result ) {
		if ( error ) {
			assert.ok( false, "amd css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		const barCss = result[ 0 ][ 0 ];
		const fooCss = result[ 1 ][ 0 ];

		assert.strictEqual( barCss, ".bar {}\n", "first run works fine" );
		assert.strictEqual( fooCss, ".foo {}\n.bar {}\n", "second run works fine" );

		done();
	} );
} );

QUnit.test( "Concurrent runs", function( assert ) {
	assert.expect( 2 );

	const done = assert.async();

	async.parallel( [
		function( callback ) {
			amdCssBuilder( files, { include: [ "bar" ] }, callback );
		},
		function( callback ) {
			amdCssBuilder( files, { include: [ "foo" ] }, callback );
		}
	], function( error, result ) {
		if ( error ) {
			assert.ok( false, "amd css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		const barCss = result[ 0 ][ 0 ];
		const fooCss = result[ 1 ][ 0 ];

		assert.strictEqual( barCss, ".bar {}\n", "first run works fine" );
		assert.strictEqual( fooCss, ".foo {}\n.bar {}\n", "second run works fine" );

		done();
	} );
} );

QUnit.test( "onCssBuildWrite property", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	amdCssBuilder( files, {
		include: [ "foo" ],
		onCssBuildWrite: function( path, data ) {
			if ( /bar/.test( path ) ) {
				data = data.replace( /bar/, "baz" ).replace( /foo/, "qux" );
			}
			return data;
		}
	}, function( error, css ) {
		if ( error ) {
			assert.ok( false, "amd css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( css, ".foo {}\n.baz {}\n",
			"rewrites CSS content via onCssBuildWrite, analogous to onBuildWrite for JS" );

		done();
	} );
} );
