import type { EntityManager } from "@mikro-orm/postgresql";
import { Answers, Exams, UserMeta } from "@/db/entities";

/** Forgets everything the user has practised; the account stays. */
export async function resetProgress(em: EntityManager, userId: string): Promise<void> {
	await em.transactional(async (tx) => {
		await tx.nativeDelete(Answers, { user_id: userId });
		await tx.nativeDelete(Exams, { user_id: userId });
		await tx.nativeDelete(UserMeta, { user_id: userId });
	});
}
