"use strict";

const fs = require( "node:fs/promises" );
const path = require( "node:path" );
const Image = require( "../lib/themeroller-image" );
const { compareImages } = require( "./lib/compare-images" );

const fixturesPath = path.join( __dirname, "fixtures" );
const tmpFolderPath = path.join( __dirname, "tmp" );

QUnit.module( "themeroller-image", {
	beforeEach: async function() {
		await fs.rm( tmpFolderPath, {
			recursive: true,
			force: true
		} );
		await fs.mkdir( tmpFolderPath, { recursive: true } );
	},
	afterEach: async function() {

		// await fs.rm( tmpFolderPath, {
		// 	recursive: true,
		// 	force: true
		// } );
	}
} );

QUnit.test( "generates correct icons", async function( assert ) {
	const done = assert.async();
	assert.expect( 1 );

	const fixturePath = path.join( fixturesPath,
		"images/ui-icons_444444_256x240.png" );

	const image = new Image( {
		icon: { color: "#444444" }
	} );

	image.get( async function( err, filename, data ) {
		if ( err ) {
			assert.ok( false, `Error: ${ err && err.message || err }` );
			done();
			return;
		}

		const iconsPath = path.join( tmpFolderPath, filename );
		await fs.writeFile( iconsPath, data );

		assert.ok( await compareImages( iconsPath, fixturePath, 2 ),
			"Images sufficiently similar" );

		done();
	} );
} );

