import { describe, expect, it } from "vitest";
import { Exams } from "@/db/entities/exams";

describe("Exams entity", () => {
	it("maps the exams table columns", () => {
		expect(Exams.meta.tableName).toBe("exams");
		expect(Object.keys(Exams.meta.properties)).toEqual(
			expect.arrayContaining(["started_at", "finished_at", "score", "passed"]),
		);
	});
});
