import { defineEntity, type InferEntity } from "@mikro-orm/core";

export const UserMeta = defineEntity({
	name: "user_meta",
	tableName: "user_meta",
	properties: (p) => ({
		user_id: p.uuid().primary(),
		key: p.text().primary(),
		value: p.json<unknown>(),
	}),
});

export type UserMeta = InferEntity<typeof UserMeta>;
