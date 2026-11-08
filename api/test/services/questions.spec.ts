import { describe, expect, it } from "vitest";
import { questionById, questions } from "@/services/questions";

describe("questions", () => {
	it("loads and validates the whole catalogue", () => {
		expect(questions).toHaveLength(310);
		expect(questionById.size).toBe(310);
		const first = questionById.get("1")!;
		expect(first.options[first.correct]).toBe("hier Meinungsfreiheit gilt.");
		expect(questionById.get("NW-10")?.part).toBe("state");
		expect(questionById.get("311")).toBeUndefined();
	});
});
