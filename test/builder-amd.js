"use strict";

QUnit.module( "builder-amd" );

const fs = require( "node:fs" );
const async = require( "async" );
const amdBuilder = require( "../lib/builder-amd" );

const files = {
	"foo.js": fs.readFileSync( __dirname + "/fixtures/builder-amd/basic/foo.js" ),
	"bar.js": fs.readFileSync( __dirname + "/fixtures/builder-amd/basic/bar.js" )
};

QUnit.test( "The JS file of the include property", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	amdBuilder( files, { include: [ "bar" ] }, function( error, js ) {
		if ( error ) {
			assert.ok( false, "amd builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual(
			js,
			"define(\"bar\",[],function(){}),define(\"output\",function(){});",
			"includes the JS file from the include property"
		);

		done();
	} );
} );

QUnit.test( "The JS dependencies", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	amdBuilder( files, { include: [ "foo" ] }, function( error, js ) {
		if ( error ) {
			assert.ok( false, "amd builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual(
			js,
			"define(\"bar\",[],function(){}),define([\"./bar\"]),define(\"output\",function(){});",
			"includes dependencies"
		);

		done();
	} );
} );

QUnit.test( "Using appDir", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	const nestedFiles = {
		"fixtures/foo.js": fs.readFileSync( __dirname +
			"/fixtures/builder-amd/basic/foo.js" ),
		"fixtures/bar.js": fs.readFileSync( __dirname +
			"/fixtures/builder-amd/basic/bar.js" )
	};

	amdBuilder( nestedFiles, { appDir: "fixtures", include: [ "foo" ] }, function( error, js ) {
		if ( error ) {
			assert.ok( false, "amd builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual(
			js,
			"define(\"bar\",[],function(){}),define([\"./bar\"]),define(\"output\",function(){});",
			"respects appDir"
		);

		done();
	} );

} );

QUnit.test( "Serial runs", function( assert ) {
	assert.expect( 2 );

	const done = assert.async();

	async.series( [
		function( callback ) {
			amdBuilder( files, { include: [ "bar" ] }, callback );
		},
		function( callback ) {
			amdBuilder( files, { include: [ "foo" ] }, callback );
		}
	], function( error, result ) {
		if ( error ) {
			assert.ok( false, "amd builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		const barJs = result[ 0 ][ 0 ];
		const fooJs = result[ 1 ][ 0 ];

		assert.strictEqual(
			barJs,
			"define(\"bar\",[],function(){}),define(\"output\",function(){});",
			"first run works fine"
		);
		assert.strictEqual(
			fooJs,
			"define(\"bar\",[],function(){}),define([\"./bar\"]),define(\"output\",function(){});",
			"second run works fine"
		);

		done();
	} );
} );

QUnit.test( "Concurrent runs", function( assert ) {
	assert.expect( 2 );

	const done = assert.async();

	async.parallel( [
		function( callback ) {
			amdBuilder( files, { include: [ "bar" ] }, callback );
		},
		function( callback ) {
			amdBuilder( files, { include: [ "foo" ] }, callback );
		}
	], function( error, result ) {
		if ( error ) {
			assert.ok( false, "amd builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		const barJs = result[ 0 ][ 0 ];
		const fooJs = result[ 1 ][ 0 ];

		assert.strictEqual(
			barJs,
			"define(\"bar\",[],function(){}),define(\"output\",function(){});",
			"first run works fine"
		);
		assert.strictEqual(
			fooJs,
			"define(\"bar\",[],function(){}),define([\"./bar\"]),define(\"output\",function(){});",
			"second run works fine"
		);

		done();
	} );
} );

QUnit.test( "onBuildWrite property", function( assert ) {
	assert.expect( 1 );

	const done = assert.async();

	amdBuilder( files, {
		include: [ "foo" ],
		optimize: "none",
		onBuildWrite: function( id, path, contents ) {
			return "/* banner for " + id + " */\n" + contents;
		}
	}, function( error, result ) {
		if ( error ) {
			assert.ok( false, "amd builder should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.strictEqual(
			result,
			"/* banner for bar */\ndefine('bar',[],function() {});\n\n/* banner for foo */\ndefine([ \"./bar\" ]);\n\n\ndefine(\"output\", function(){});\n",
			"onBuildWrite is applied"
		);
		done();
	} );
} );

