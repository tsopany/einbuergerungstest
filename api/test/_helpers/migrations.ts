import { readdirSync } from "node:fs";
import { join } from "node:path";

export const MIGRATIONS_DIR = join(import.meta.dirname, "../../src/db/migrations");

export const migrationFiles = (): string[] =>
	readdirSync(MIGRATIONS_DIR)
		.filter((name) => name.endsWith(".sql"))
		.sort();
