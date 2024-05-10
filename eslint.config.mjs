import jqueryConfig from "eslint-config-jquery";
import globals from "globals";

export default [
	{
		linterOptions: {
			reportUnusedDisableDirectives: "error"
		}
	},

	{
		ignores: [
			"app/dist/**",
			"external/**",
			"jquery-ui/**",
			"template/**",
			"test/fixtures/**",
			"tmp/**",
			"*.min.js"
		]
	},

	{
		languageOptions: {
			sourceType: "commonjs",
			ecmaVersion: 2022,
			parserOptions: {
				globalReturn: true
			},
			globals: {
				...globals.es2021,
				...globals.node
			}
		},
		rules: {
			...jqueryConfig.rules,
			strict: [ "error", "global" ],

			// Too many violations
			"camelcase": "off",
			"max-len": "off",
			"no-unused-vars": "error"
		}
	},

	{
		files: [ "*.mjs" ],
		languageOptions: {
			sourceType: "module"
		}
	},

	{
		files: [ "test/*.js" ],
		languageOptions: {
			globals: {
				...globals.es2021,
				...globals.node,
				...globals.mocha
			}
		}
	},

	{
		files: [ "app/src/**/*.js" ],
		languageOptions: {

			// No need to keep IE support, so we could bump it to ES2022 as well,
			// but we need to switch the minifier to something other than UglifJS
			// which is ES5-only.
			ecmaVersion: 5,
			sourceType: "script",
			parserOptions: {
				globalReturn: false
			},
			globals: {
				...globals.es2021,
				...globals.browser,
				jQuery: false
			}
		},
		rules: {
			"strict": [ "error", "function" ]
		}
	}
];
