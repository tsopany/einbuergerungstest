import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const src = fileURLToPath(new URL("./src", import.meta.url));
const shared = fileURLToPath(new URL("../shared", import.meta.url));
const testDb = fileURLToPath(new URL("./test/_helpers/db.pglite.ts", import.meta.url));

export const realOnly = ["test/real/**", "test/db/migrate.spec.ts", "test/db/reset.spec.ts", "test/db/setup.spec.ts"];

export const testEnv = {
	DATABASE_URL: "postgresql://einbuergerungstest:einbuergerungstest@localhost:5432/einbuergerungstest_test",
	JWT_SECRET: "test-secret-test-secret-test-secret-0123456789",
	GOOGLE_CLIENT_ID: "google-id",
	GOOGLE_CLIENT_SECRET: "google-secret",
	GOOGLE_CALLBACK_URL: "http://localhost:8115/api/auth/google/callback",
};

export const aliases = (db: string) => [
	{ find: /^@\//, replacement: `${src}/` },
	{ find: /^#shared\//, replacement: `${shared}/` },
	{ find: /^#testdb$/, replacement: db },
];

export default defineConfig({
	plugins: [tsconfigPaths()],
	resolve: { alias: aliases(testDb) },
	test: {
		globals: true,
		environment: "node",
		pool: "forks",
		env: testEnv,
		testTimeout: 30000,
		hookTimeout: 60000,
		exclude: ["node_modules/**", "dist/**", ...realOnly],
		coverage: {
			provider: "v8",
			reportsDirectory: "./coverage",
			reporter: ["text", "text-summary", "json", "html", "lcov"],
			include: ["src/**/*.ts"],
			// migrate, reset and setup are covered by the specs of `pnpm test:real` (realOnly), which need a real Postgres
			exclude: ["src/**/*.d.ts", "src/db/migrate.ts", "src/db/reset.ts", "src/db/setup.ts"],
			thresholds: { statements: 85, branches: 88, functions: 83, lines: 85 },
		},
	},
});
