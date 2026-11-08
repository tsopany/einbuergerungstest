import { defineEntity, type InferEntity } from "@mikro-orm/core";

export const RefreshTokens = defineEntity({
	name: "refresh_tokens",
	tableName: "refresh_tokens",
	properties: (p) => ({
		token_hash: p.text().primary(),
		user_id: p.uuid(),
		family_id: p.uuid().defaultRaw("gen_random_uuid()"),
		used_at: p.datetime().columnType("timestamptz").nullable(),
		expires_at: p.datetime().columnType("timestamptz"),
		created_at: p.datetime().columnType("timestamptz").defaultRaw("now()"),
	}),
});

export type RefreshTokens = InferEntity<typeof RefreshTokens>;
