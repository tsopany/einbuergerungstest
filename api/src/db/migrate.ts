import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "pg";
import { config } from "@/config";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");
const LOCK_KEY = "einbuergerungstest_migrations";

const checksum = (sql: string) => createHash("sha256").update(sql).digest("hex");

export async function runMigrations(dir = MIGRATIONS_DIR): Promise<string[]> {
	const client = new Client({ connectionString: config.DATABASE_URL });
	await client.connect();
	try {
		await client.query("select set_config('lock_timeout', $1, false)", [`${config.MIGRATION_LOCK_TIMEOUT_MS}ms`]);
		await client.query("select pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
		await client.query("set lock_timeout = 0");
		await client.query(
			`create table if not exists schema_migrations (
				name text primary key,
				checksum text not null,
				applied_at timestamptz not null default now()
			)`,
		);
		const { rows } = await client.query<{ name: string; checksum: string }>(
			"select name, checksum from schema_migrations",
		);
		const applied = new Map(rows.map((row) => [row.name, row.checksum]));
		const executed: string[] = [];
		for (const file of readdirSync(dir)
			.filter((name) => name.endsWith(".sql"))
			.sort()) {
			const sql = readFileSync(join(dir, file), "utf8");
			const stored = applied.get(file);
			if (stored !== undefined) {
				if (stored !== checksum(sql)) {
					throw new Error(
						`migration ${file} was already applied but has changed on disk; ship a new migration instead`,
					);
				}
				continue;
			}
			await client.query("begin");
			try {
				await client.query(sql);
				await client.query("insert into schema_migrations (name, checksum) values ($1, $2)", [
					file,
					checksum(sql),
				]);
				await client.query("commit");
			} catch (error) {
				await client.query("rollback");
				throw error;
			}
			executed.push(file);
		}
		return executed;
	} finally {
		await client.end().catch(() => undefined);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		const executed = await runMigrations();
		process.stdout.write(executed.length ? `applied: ${executed.join(", ")}\n` : "no pending migrations\n");
	} catch (error) {
		process.stderr.write(`migration failed: ${String(error)}\n`);
		process.exit(1);
	}
}
