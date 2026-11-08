import type { EntityManager } from "@mikro-orm/postgresql";

export const rawQuery = <T>(em: EntityManager, sql: string, params: unknown[] = []): Promise<T[]> =>
	em.getConnection().execute(sql, params, "all", em.getTransactionContext());
