import { defineEntity, type InferEntity } from "@mikro-orm/core";

export const Exams = defineEntity({
	name: "exams",
	tableName: "exams",
	properties: (p) => ({
		id: p.integer().primary().autoincrement(),
		user_id: p.uuid(),
		started_at: p.datetime().columnType("timestamptz").defaultRaw("now()"),
		finished_at: p.datetime().columnType("timestamptz").nullable(),
		score: p.smallint().nullable(),
		passed: p.boolean().nullable(),
	}),
});

export type Exams = InferEntity<typeof Exams>;
