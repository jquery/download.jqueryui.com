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
				...globals.qunit
			}
		}
	},

	{
		files: [ "app/src/**/*.js" ],
		languageOptions: {
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
