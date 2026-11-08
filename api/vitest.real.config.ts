import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

import { aliases, testEnv } from "./vitest.config";

const testDb = fileURLToPath(new URL("./test/_helpers/db.real.ts", import.meta.url));

export default defineConfig({
	plugins: [tsconfigPaths()],
	resolve: { alias: aliases(testDb) },
	test: {
		globals: true,
		environment: "node",
		pool: "forks",
		env: testEnv,
		setupFiles: ["./test/real/setup.ts"],
		testTimeout: 60000,
		hookTimeout: 120000,
		exclude: ["node_modules/**", "dist/**"],
	},
});
