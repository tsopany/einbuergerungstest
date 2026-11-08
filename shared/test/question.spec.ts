import {
	compareIds,
	EXAM,
	idNumber,
	isQuestionId,
	QUESTION_COUNT,
	QUESTION_IDS,
	questionSchema,
	questionsSchema,
} from "../question";

const sample = {
	id: "1",
	part: "general",
	text: "In Deutschland dürfen Menschen offen etwas gegen die Regierung sagen, weil …",
	options: ["a", "b", "c", "d"],
	correct: 3,
	images: [],
};

describe("question ids", () => {
	it.each([
		["1", "general", 1],
		["300", "general", 300],
		["NW-1", "state", 1],
		["NW-10", "state", 10],
	])("reads %s", (id, part, number) => {
		expect(idNumber(id)).toEqual({ part, number });
		expect(isQuestionId(id)).toBe(true);
	});

	it.each(["0", "301", "NW-0", "NW-11", "nw-1", "x", "", "1.5", "1000"])("rejects %j", (id) => {
		expect(idNumber(id)).toBeNull();
		expect(isQuestionId(id)).toBe(false);
	});
});

describe("question schema", () => {
	it("accepts a well formed question", () => {
		expect(questionSchema.parse(sample)).toEqual(sample);
		expect(questionSchema.safeParse({ ...sample, id: "NW-3", part: "state", images: ["NW-3-1.png"] }).success).toBe(
			true,
		);
	});

	it.each([
		["a key outside 0-3", { correct: 4 }],
		["three options", { options: ["a", "b", "c"] }],
		["an empty text", { text: "  " }],
		["an id that does not match its part", { part: "state" }],
		["an unknown image name", { images: ["../etc/passwd"] }],
	])("rejects %s", (_name, patch) => {
		expect(questionSchema.safeParse({ ...sample, ...patch }).success).toBe(false);
	});

	it("needs exactly 310 distinct questions", () => {
		const all = Array.from({ length: QUESTION_COUNT }, (_, index) =>
			index < 300 ? { ...sample, id: String(index + 1) } : { ...sample, id: `NW-${index - 299}`, part: "state" },
		);
		expect(questionsSchema.safeParse(all).success).toBe(true);
		expect(questionsSchema.safeParse(all.slice(1)).success).toBe(false);
		expect(questionsSchema.safeParse([...all.slice(1), all[1]]).success).toBe(false);
	});
});

describe("exam rules", () => {
	it("is 30 general + 3 state questions, pass mark 17 of 33, 60 minutes", () => {
		expect(EXAM).toEqual({ total: 33, general: 30, state: 3, minutes: 60, passMark: 17 });
		expect(EXAM.general + EXAM.state).toBe(EXAM.total);
	});
});

describe("catalogue order", () => {
	it("lists every id once, general first", () => {
		expect(QUESTION_IDS).toHaveLength(QUESTION_COUNT);
		expect(QUESTION_IDS.slice(0, 2)).toEqual(["1", "2"]);
		expect(QUESTION_IDS.at(-1)).toBe("NW-10");
		expect(QUESTION_IDS.every((id) => isQuestionId(id))).toBe(true);
	});

	it("sorts by number, general before state, and falls back to text for strangers", () => {
		expect(["NW-2", "10", "NW-1", "9", "300"].sort(compareIds)).toEqual(["9", "10", "300", "NW-1", "NW-2"]);
		expect(compareIds("a", "b")).toBeLessThan(0);
		expect(compareIds("1", "x")).not.toBe(0);
	});
});
