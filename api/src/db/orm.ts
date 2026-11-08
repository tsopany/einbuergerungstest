import { MikroORM, type EntityManager } from "@mikro-orm/postgresql";
import { config, databaseConnection } from "@/config";
import { allEntities } from "@/db/entities";

let ormInstance: MikroORM | null = null;
let ormInitializing: Promise<MikroORM> | null = null;

export function initOrm(): Promise<MikroORM> {
	if (ormInstance) return Promise.resolve(ormInstance);
	ormInitializing ??= createOrm()
		.then((orm) => (ormInstance = orm))
		.finally(() => {
			ormInitializing = null;
		});
	return ormInitializing;
}

function createOrm(): Promise<MikroORM> {
	return MikroORM.init({
		entities: allEntities,
		...databaseConnection,
		driverOptions: databaseConnection.ssl ? { connection: { ssl: { rejectUnauthorized: false } } } : undefined,
		debug: config.NODE_ENV === "development",
		forceUtcTimezone: true,
	});
}

export function useOrm(orm: MikroORM | null): void {
	ormInstance = orm;
}

export function getOrm(): MikroORM {
	if (!ormInstance) throw new Error("MikroORM is not initialized");
	return ormInstance;
}

export const getEm = (): EntityManager => getOrm().em.fork();

export async function closeOrm(): Promise<void> {
	if (!ormInstance) return;
	await ormInstance.close();
	ormInstance = null;
}
