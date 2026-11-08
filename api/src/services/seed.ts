import { randomInt } from "node:crypto";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { UserMeta } from "@/db/entities";

const KEY = "seed";

/** The number that fixes a user's deck order; made once, on first use, and kept until the progress is reset. */
export async function seedFor(em: EntityManager, userId: string): Promise<number> {
	const existing = await em.findOne(UserMeta, { user_id: userId, key: KEY });
	if (existing) return existing.value as number;
	const seed = randomInt(2 ** 31);
	try {
		await em.insert(UserMeta, { user_id: userId, key: KEY, value: seed });
		return seed;
	} catch (error) {
		if (!(error instanceof UniqueConstraintViolationException)) throw error;
		return (await em.findOneOrFail(UserMeta, { user_id: userId, key: KEY })).value as number;
	}
}
