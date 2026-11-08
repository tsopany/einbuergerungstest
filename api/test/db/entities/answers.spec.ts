import { describe, expect, it } from "vitest";
import { Answers } from "@/db/entities/answers";

describe("Answers entity", () => {
	it("maps the answers table columns", () => {
		expect(Answers.meta.tableName).toBe("answers");
		expect(Object.keys(Answers.meta.properties)).toEqual(
			expect.arrayContaining(["question_id", "chosen", "correct", "answered_at", "source", "exam_id"]),
		);
	});
});
