"use strict";

const async = require( "async" );
const requirejs = require( "../lib/requirejs-memfiles" );

QUnit.module( "requirejs-memfiles" );

QUnit.test( "requirejs.optimize", function( assert ) {
	assert.expect( 2 );

	const done = assert.async();

	const files = {
		"a.js": "define([\"./b\"], function( b ) { return b; });",
		"b.js": "define(function() { return \"B\"; });"
	};

	requirejs.setFiles( files, function( doneRequirejsMemfiles ) {
		requirejs.optimize( {
			appDir: ".",
			baseUrl: ".",
			dir: "dist",
			modules: [ {
				name: "output",
				include: "a",
				create: true
			} ]
		}, function() {
		assert.ok( "dist/output.js" in files,
			"dist/output.js is in files" );
			assert.strictEqual(
				files[ "dist/output.js" ],
				"define(\"b\",[],function(){return\"B\"}),define(\"a\",[\"./b\"]," +
					"function(e){return e}),define(\"output\",function(){});",
				"dist/output.js has expected content"
			);

			done();
			doneRequirejsMemfiles();
		}, function( error ) {
			assert.ok( false, "requirejs.optimize should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			doneRequirejsMemfiles();
		} );
	} );
} );

QUnit.test( "concurrent requirejs.optimize calls", function( assert ) {
	assert.expect( 6 );

	const done = assert.async();

	const filesA = {
		"a.js": "define([\"./b\"], function( b ) { return b; });",
		"b.js": "define(function() { return \"B\"; });"
	};
	const filesB = {
		"a.js": "define([\"./b\"], function( b ) { return b; });",
		"b.js": "define(function() { return \"B\"; });"
	};

	async.parallel( [
		function( callback ) {
			requirejs.setFiles( filesA, function( doneRequirejsMemfiles ) {
				requirejs.optimize( {
					appDir: ".",
					baseUrl: ".",
					dir: "dist",
					modules: [ {
						name: "outputA",
						include: "a",
						create: true
					} ]
				}, function() {
					callback();
					doneRequirejsMemfiles();
				}, function( error ) {
					callback( error );
					doneRequirejsMemfiles();
				} );
			} );
		},
		function( callback ) {
			requirejs.setFiles( filesB, function( doneRequirejsMemfiles ) {
				requirejs.optimize( {
					appDir: ".",
					baseUrl: ".",
					dir: "dist",
					modules: [ {
						name: "outputB",
						include: "a",
						create: true
					} ]
				}, function() {
					callback();
					doneRequirejsMemfiles();
				}, function( error ) {
					callback( error );
					doneRequirejsMemfiles();
				} );
			} );
		}
	], function( error ) {
		if ( error ) {
			assert.ok( false, "requirejs.optimize should not fail" + ( error ?
				` with error: ${ error?.message || error }` :
				""
			) );
			done();
			return;
		}

		assert.ok( "dist/outputA.js" in filesA,
			"dist/outputA.js is in filesA" );
		assert.notOk( "dist/outputB.js" in filesA,
			"dist/outputB.js is not in filesA" );
		assert.strictEqual(
			filesA[ "dist/outputA.js" ],
			"define(\"b\",[],function(){return\"B\"}),define(\"a\",[\"./b\"]," +
				"function(e){return e}),define(\"outputA\",function(){});",
			"dist/outputA.js has expected content"
		);

		assert.ok( "dist/outputB.js" in filesB,
			"dist/outputB.js is in filesB" );
		assert.notOk( "dist/outputA.js" in filesB,
			"dist/outputA.js is not in filesB" );
		assert.strictEqual(
			filesB[ "dist/outputB.js" ],
			"define(\"b\",[],function(){return\"B\"}),define(\"a\",[\"./b\"]," +
				"function(e){return e}),define(\"outputB\",function(){});",
			"dist/outputB.js has expected content"
		);

		done();
	} );

} );
