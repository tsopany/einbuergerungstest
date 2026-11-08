import js from '@eslint/js';
import globals from 'globals';

import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
	js.configs.recommended,
	...pluginVue.configs['flat/recommended'],
	sonarjs.configs.recommended,
	eslintConfigPrettier,
	{
		files: ['*.vue', '**/*.vue'],
		languageOptions: {
			parser: vueParser,
			sourceType: 'module',
			ecmaVersion: 'latest',
			parserOptions: {
				parser: tsparser,
				ecmaFeatures: {
					globalReturn: false,
					impliedStrict: false,
					jsx: false
				}
			}
		}
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: './tsconfig.json'
			}
		},
		plugins: {
			'@typescript-eslint': tseslint
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['test/**/*.js', 'test/**/*.ts', '**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				describe: 'readonly',
				test: 'readonly',
				it: 'readonly',
				expect: 'readonly',
				beforeAll: 'readonly',
				afterAll: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
				vi: 'readonly',
				vitest: 'readonly'
			}
		}
	},
	{
		plugins: {
			'unused-imports': unusedImports
		},
		rules: {
			eqeqeq: 'error',
			'prefer-const': 'warn',
			'no-var': 'error',
			'no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			'vue/no-mutating-props': [
				'warn',
				{
					shallowOnly: true
				}
			],
			complexity: ['warn', 10],
			'max-params': ['warn', 5],
			'max-depth': ['warn', 3],
			'max-statements': ['warn', 25],
			'vue/no-v-html': 0,
			'vue/attributes-order': 0,
			'vue/require-prop-types': 0,
			'vue/require-default-prop': 0,
			'vue/attribute-hyphenation': 0,
			'vue/multi-word-component-names': 0,
			'vue/no-v-text-v-html-on-component': 0
		},
		languageOptions: {
			globals: {
				...globals.browser,
				__APP_VERSION__: 'readonly',
				__BUILD_COMMIT__: 'readonly'
			}
		}
	},
	{
		files: ['src/stores/**/*.ts'],
		rules: {'max-statements': ['warn', 40]}
	},
	{
		files: ['src/**/*.ts', 'src/**/*.vue'],
		ignores: ['src/lib/api.ts'],
		rules: {
			'no-restricted-globals': ['error', {name: 'fetch', message: 'Call the API through src/lib/api.ts.'}],
			'no-restricted-properties': [
				'error',
				{object: 'window', property: 'fetch', message: 'Call the API through src/lib/api.ts.'},
				{object: 'globalThis', property: 'fetch', message: 'Call the API through src/lib/api.ts.'}
			],
			'no-restricted-imports': ['error', {paths: [{name: 'axios', message: 'Call the API through src/lib/api.ts.'}]}]
		}
	}
];
