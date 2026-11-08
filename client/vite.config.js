import dns from 'dns';
import fs from 'fs';
import path from 'path';
import {execSync} from 'node:child_process';

import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';

import pkg from './package.json' with {type: 'json'};

const {version} = pkg;

dns.setDefaultResultOrder('verbatim');

const getBuildCommit = () => {
	if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 8);
	try {
		return execSync('git rev-parse --short=8 HEAD', {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
	} catch {
		return 'dev';
	}
};

const buildCommit = getBuildCommit();
const buildTime = new Date().toISOString();

const versionJsonPlugin = () => ({
	name: 'version-json',
	writeBundle: (options) => {
		const dir = options.dir || path.resolve(import.meta.dirname, 'dist');
		fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({version, commit: buildCommit, time: buildTime}));
	}
});

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(version),
		__BUILD_COMMIT__: JSON.stringify(buildCommit)
	},
	build: {
		rollupOptions: {
			output: {
				entryFileNames: `assets/[name]-${version}-[hash].js`,
				chunkFileNames: `assets/[name]-${version}-[hash].js`,
				assetFileNames: `assets/[name]-${version}-[hash].[ext]`
			}
		}
	},
	plugins: [vue(), versionJsonPlugin()],
	resolve: {
		alias: [
			{find: '@', replacement: path.resolve(import.meta.dirname, 'src')},
			{find: 'test', replacement: path.resolve(import.meta.dirname, 'test')},
			{find: /^#shared\//, replacement: `${path.resolve(import.meta.dirname, '../shared')}/`}
		]
	}
});
