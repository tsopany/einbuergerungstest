import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Identities, Users } from "@/db/entities";

export const toProfile = (user: { id: string; email: string }) => ({ id: user.id, email: user.email });

export type Provider = "google";
export type Profile = { provider: Provider; externalId: string; email: string };

export async function signIn(em: EntityManager, profile: Profile): Promise<Users> {
	try {
		return await signInOnce(em, profile);
	} catch (error) {
		if (!(error instanceof UniqueConstraintViolationException)) throw error;
		return signInOnce(em, profile);
	}
}

function signInOnce(em: EntityManager, profile: Profile): Promise<Users> {
	const email = profile.email.trim().toLowerCase();
	return em.transactional(async (tx) => {
		const identity = await tx.findOne(Identities, { provider: profile.provider, external_id: profile.externalId });
		if (identity) {
			await tx.nativeUpdate(Identities, { id: identity.id }, { email });
			return tx.findOneOrFail(Users, { id: identity.user_id });
		}
		const existing = await tx.findOne(Users, { email }, { orderBy: { created_at: "asc" } });
		const userId = existing?.id ?? (await tx.insert(Users, { email }));
		await tx.insert(Identities, {
			user_id: userId,
			provider: profile.provider,
			external_id: profile.externalId,
			email,
		});
		return tx.findOneOrFail(Users, { id: userId }, { refresh: true });
	});
}

export const findUser = (em: EntityManager, id: string) => em.findOne(Users, { id }, { refresh: true });

/** Removes the user; identities, refresh tokens, answers, exams and meta go with it. */
export const deleteUser = (em: EntityManager, id: string) => em.nativeDelete(Users, { id });
