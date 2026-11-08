import { defineEntity, type InferEntity } from "@mikro-orm/core";

export const Answers = defineEntity({
	name: "answers",
	tableName: "answers",
	properties: (p) => ({
		id: p.integer().primary().autoincrement(),
		user_id: p.uuid(),
		question_id: p.text(),
		chosen: p.smallint(),
		correct: p.boolean(),
		answered_at: p.datetime().columnType("timestamptz").defaultRaw("now()"),
		source: p.text(),
		exam_id: p.integer().nullable(),
	}),
});

export type Answers = InferEntity<typeof Answers>;
