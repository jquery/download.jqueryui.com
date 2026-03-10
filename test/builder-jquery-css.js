"use strict";

const fs = require( "node:fs" );
const async = require( "async" );
const jQueryCSSBuilder = require( "../lib/builder-jquery-css" );

QUnit.module( "builder-jquery-css" );

const files = {
	"foo.js": fs.readFileSync( __dirname + "/fixtures/builder-jquery-css/basic/foo.js" ),
	"bar.js": fs.readFileSync( __dirname + "/fixtures/builder-jquery-css/basic/bar.js" ),
	"foo.css": fs.readFileSync( __dirname + "/fixtures/builder-jquery-css/basic/foo.css" ),
	"bar.css": fs.readFileSync( __dirname + "/fixtures/builder-jquery-css/basic/bar.css" )
};

QUnit.test( "Basic", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	jQueryCSSBuilder( files, "baz", { include: [ "foo" ] }, function( error, css ) {
		if ( error ) {
			assert.ok( false, "css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( css, ".foo {}\n.bar {}\n", "basic functionality works" );

		done();
	} );
} );

QUnit.test( "Basic - using appDir", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	const files = {
		"fixtures/foo.js": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/basic/foo.js" ),
		"fixtures/bar.js": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/basic/bar.js" ),
		"fixtures/foo.css": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/basic/foo.css" ),
		"fixtures/bar.css": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/basic/bar.css" )
	};

	jQueryCSSBuilder( files, "baz", { appDir: "fixtures", include: [ "foo" ] }, function( error, css ) {
		if ( error ) {
			assert.ok( false, "css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( css, ".foo {}\n.bar {}\n", "basic functionality works with appDir" );

		done();
	} );

} );

QUnit.test( "Basic - nested+appdir", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	const files = {
		"fixtures/version.js": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/nested/version.js" ),
		"fixtures/widgets/input.js": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/nested/widgets/input.js" ),
		"fixtures/theme/version.css": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/nested/theme/version.css" ),
		"fixtures/theme/input.css": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/nested/theme/input.css" )
	};

	jQueryCSSBuilder( files, "structure", { appDir: "fixtures", include: [ "widgets/input" ] }, function( error, css ) {
		if ( error ) {
			assert.ok( false, "css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( css, "input {}\nbody {}\n", "nested+appdir functionality works" );

		done();
	} );

} );

QUnit.test( "Two bundles", function( assert ) {
	assert.expect( 2 );

	const done = assert.async();

	const files = {
		"foo.js": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/two-bundles/foo.js" ),
		"bar.js": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/two-bundles/bar.js" ),
		"baz.js": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/two-bundles/baz.js" ),
		"foo.css": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/two-bundles/foo.css" ),
		"bar.css": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/two-bundles/bar.css" ),
		"baz.css": fs.readFileSync( __dirname +
			"/fixtures/builder-jquery-css/two-bundles/baz.css" )
	};

	async.series( [
		function( callback ) {
			jQueryCSSBuilder( files, "north", { include: [ "foo" ] }, callback );
		},
		function( callback ) {
			jQueryCSSBuilder( files, "south", { include: [ "foo" ] }, callback );
		}
	], function( error, result ) {
		if ( error ) {
			assert.ok( false, "css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		const northCss = result[ 0 ][ 0 ];
		const southCss = result[ 1 ][ 0 ];

		assert.strictEqual( northCss, ".bar {}\n.baz {}\n", "north bundle builds correctly" );
		assert.strictEqual( southCss, ".foo {}\n", "south bundle builds correctly" );

		done();
	} );

} );

QUnit.test( "Empty bundle", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	jQueryCSSBuilder( files, "nonexistent", { include: [ "foo" ] }, function( error, result ) {
		if ( error ) {
			assert.ok( false, "css builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual( result, "", "empty bundle builds just fine" );

		done();
	} );

} );
