import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { config } from "@/config";
import { runMigrations } from "@/db/migrate";

export async function resetDatabase(): Promise<string[]> {
	if (config.NODE_ENV === "production") throw new Error("refusing to reset a production database");
	const client = new Client({ connectionString: config.DATABASE_URL });
	await client.connect();
	try {
		await client.query("drop schema public cascade");
		await client.query("create schema public");
	} finally {
		await client.end();
	}
	return runMigrations();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		const executed = await resetDatabase();
		process.stdout.write(`applied: ${executed.join(", ")}\n`);
	} catch (error) {
		process.stderr.write(`reset failed: ${String(error)}\n`);
		process.exit(1);
	}
}
