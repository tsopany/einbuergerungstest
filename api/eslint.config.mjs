import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import sonarjs from "eslint-plugin-sonarjs";

export default [
	{ files: ["**/*.{js,mjs,cjs,ts}"] },
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	sonarjs.configs.recommended,
	{
		plugins: { "unused-imports": unusedImports },
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"unused-imports/no-unused-imports": "error",
		},
	},
	{ files: ["test/real/**/*.ts"], rules: { "sonarjs/sql-queries": "off" } },
];
