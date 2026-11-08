import { Client } from "pg";
import { config } from "@/config";
import { closeOrm as closeRealOrm, initOrm as initRealOrm } from "@/db/orm";
import { resetDatabase as resetRealDatabase } from "@/db/reset";
import type { Queryable } from "./seeds";

export * from "./seeds";

export async function withClient<T>(run: (client: Queryable) => Promise<T>): Promise<T> {
	const client = new Client({ connectionString: config.DATABASE_URL });
	await client.connect();
	try {
		return await run(client);
	} finally {
		await client.end();
	}
}

export const resetDatabase = async (): Promise<void> => {
	await resetRealDatabase();
};

export const initOrm = initRealOrm;
export const closeOrm = closeRealOrm;
