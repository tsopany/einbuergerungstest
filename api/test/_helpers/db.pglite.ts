import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, types } from "@electric-sql/pglite";
import { MikroORM } from "@mikro-orm/pglite";
import type { MikroORM as PostgresMikroORM } from "@mikro-orm/postgresql";
import { allEntities } from "@/db/entities";
import { useOrm } from "@/db/orm";
import { MIGRATIONS_DIR, migrationFiles } from "./migrations";
import type { Queryable } from "./seeds";

export * from "./seeds";

let pglite: PGlite | null = null;
let orm: MikroORM | null = null;

async function database(): Promise<PGlite> {
	pglite ??= await PGlite.create({ parsers: { [types.DATE]: (value: string) => value } });
	return pglite;
}

export async function withClient<T>(run: (client: Queryable) => Promise<T>): Promise<T> {
	return run(await database());
}

export async function resetDatabase(): Promise<void> {
	const db = await database();
	await db.exec("drop schema public cascade; create schema public;");
	for (const file of migrationFiles()) await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
}

export async function initOrm(): Promise<PostgresMikroORM> {
	const db = await database();
	orm ??= await MikroORM.init({
		entities: allEntities,
		dbName: "einbuergerungstest_test",
		driverOptions: { pglite: db },
		forceUtcTimezone: true,
	});
	useOrm(orm as unknown as PostgresMikroORM);
	return orm as unknown as PostgresMikroORM;
}

export async function closeOrm(): Promise<void> {
	useOrm(null);
	await orm?.close();
	orm = null;
	await pglite?.close();
	pglite = null;
}
