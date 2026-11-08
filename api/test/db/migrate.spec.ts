import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "@/db/migrate";
import { migrationFiles } from "../_helpers/migrations";
import { resetDatabase } from "@/db/reset";
import { withClient } from "#testdb";

describe("migrations", () => {
	beforeAll(async () => {
		await resetDatabase();
	});

	it("applies the baseline once and is then a no-op", async () => {
		expect(await runMigrations()).toEqual([]);
		const names = await withClient(async (client) =>
			(await client.query("select name from schema_migrations")).rows.map((row) => row.name),
		);
		expect(names).toEqual(migrationFiles());
	});

	it("refuses an applied migration whose content changed", async () => {
		const dir = mkdtempSync(join(tmpdir(), "migrations-"));
		writeFileSync(join(dir, "001_baseline.sql"), "select 1;");
		await expect(runMigrations(dir)).rejects.toThrow(/already applied/);
	});

	it("rolls back a failing migration", async () => {
		const dir = mkdtempSync(join(tmpdir(), "migrations-"));
		writeFileSync(
			join(dir, "001_baseline.sql"),
			(await import("node:fs")).readFileSync(
				join(import.meta.dirname, "../../src/db/migrations/001_baseline.sql"),
				"utf8",
			),
		);
		writeFileSync(join(dir, "999_bad.sql"), "create table half_done (id int); select 1/0;");
		await expect(runMigrations(dir)).rejects.toThrow();
		const rows = await withClient(
			async (client) => (await client.query("select to_regclass('half_done') as t")).rows,
		);
		expect(rows[0].t).toBeNull();
	});
});
