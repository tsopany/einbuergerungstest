import { defineEntity, type InferEntity } from "@mikro-orm/core";

export const Identities = defineEntity({
	name: "identities",
	tableName: "identities",
	properties: (p) => ({
		id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
		user_id: p.uuid(),
		provider: p.text(),
		external_id: p.text(),
		email: p.text(),
		created_at: p.datetime().columnType("timestamptz").defaultRaw("now()"),
		updated_at: p.datetime().columnType("timestamptz").defaultRaw("now()"),
	}),
});

export type Identities = InferEntity<typeof Identities>;
