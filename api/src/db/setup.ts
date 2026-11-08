import { runMigrations } from "@/db/migrate";
import { initOrm } from "@/db/orm";

export async function applyDatabaseSetup(): Promise<string[]> {
	const migrations = await runMigrations();
	await initOrm();
	return migrations;
}
