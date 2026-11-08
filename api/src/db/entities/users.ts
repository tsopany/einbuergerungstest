import { defineEntity, type InferEntity } from "@mikro-orm/core";

export const Users = defineEntity({
	name: "users",
	tableName: "users",
	properties: (p) => ({
		id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
		email: p.text(),
		created_at: p.datetime().columnType("timestamptz").defaultRaw("now()"),
		updated_at: p.datetime().columnType("timestamptz").defaultRaw("now()"),
	}),
});

export type Users = InferEntity<typeof Users>;
