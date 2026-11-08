import { createHash, randomBytes } from "node:crypto";
import type { EntityManager } from "@mikro-orm/postgresql";
import { RefreshTokens } from "@/db/entities";
import { rawQuery } from "@/db/query";

export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type ConsumedToken = { userId: string; familyId: string };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueRefreshToken(
	em: EntityManager,
	userId: string,
	now = new Date(),
	familyId: string = crypto.randomUUID(),
): Promise<string> {
	const token = randomBytes(32).toString("base64url");
	await em.nativeDelete(RefreshTokens, { expires_at: { $lt: now } });
	await em.insert(RefreshTokens, {
		token_hash: hash(token),
		user_id: userId,
		family_id: familyId,
		expires_at: new Date(now.getTime() + REFRESH_TTL_MS),
	});
	return token;
}

export async function revokeFamily(em: EntityManager, token: string): Promise<void> {
	await rawQuery(
		em,
		"delete from refresh_tokens where family_id = (select family_id from refresh_tokens where token_hash = ?)",
		[hash(token)],
	);
}

export async function consumeRefreshToken(
	em: EntityManager,
	token: string,
	now = new Date(),
): Promise<ConsumedToken | null> {
	const rows = await rawQuery<{ user_id: string; family_id: string; expires_at: string }>(
		em,
		"update refresh_tokens set used_at = ? where token_hash = ? and used_at is null returning user_id, family_id, expires_at",
		[now, hash(token)],
	);
	if (!rows[0]) {
		await revokeFamily(em, token);
		return null;
	}
	return new Date(rows[0].expires_at) > now ? { userId: rows[0].user_id, familyId: rows[0].family_id } : null;
}
