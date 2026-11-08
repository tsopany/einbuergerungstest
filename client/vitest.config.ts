import {defineConfig, mergeConfig} from 'vitest/config';

import viteConfig from './vite.config.js';

export default mergeConfig(
	viteConfig,
	defineConfig({
		server: {fs: {allow: ['..']}},
		test: {
			globals: true,
			environment: 'happy-dom',
			restoreMocks: true,
			setupFiles: ['./test/_setup/vitest.setup.ts'],
			include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)', '../shared/test/**/*.spec.ts'],
			coverage: {
				provider: 'v8',
				reportsDirectory: './coverage',
				reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
				include: ['src/**/*.vue', 'src/**/*.ts', '../shared/*.ts'],
				allowExternal: true,
				exclude: ['src/**/*.d.ts'],
				thresholds: {statements: 95, branches: 90, functions: 95, lines: 95}
			}
		}
	})
);
