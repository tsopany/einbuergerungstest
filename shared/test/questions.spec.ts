import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { questionsSchema } from "../question";

const root = path.resolve(import.meta.dirname, "../..");
const questions = questionsSchema.parse(JSON.parse(readFileSync(path.join(root, "shared/questions.json"), "utf8")));

describe("questions.json", () => {
	it("has the 300 general and the 10 Nordrhein-Westfalen questions, one key each", () => {
		expect(questions).toHaveLength(310);
		expect(questions.filter((question) => question.part === "general").map((question) => question.id)).toEqual(
			Array.from({ length: 300 }, (_, index) => String(index + 1)),
		);
		expect(questions.filter((question) => question.part === "state").map((question) => question.id)).toEqual(
			Array.from({ length: 10 }, (_, index) => `NW-${index + 1}`),
		);
	});

	it("keys question 1 to the freedom of speech", () => {
		const first = questions[0];
		expect(first.text).toContain("offen etwas gegen die Regierung sagen");
		expect(first.options[first.correct]).toBe("hier Meinungsfreiheit gilt.");
	});

	it("has the 13 picture questions, each with its image files", () => {
		const pictured = questions.filter((question) => question.images.length);
		expect(pictured.map((question) => question.id)).toEqual([
			"21",
			"55",
			"70",
			"130",
			"176",
			"181",
			"187",
			"209",
			"216",
			"226",
			"235",
			"NW-1",
			"NW-8",
		]);
		for (const question of pictured)
			for (const image of question.images)
				expect(existsSync(path.join(root, "client/public/images", image)), image).toBe(true);
		for (const id of ["21", "209", "226", "NW-1"])
			expect(questions.find((question) => question.id === id)?.options).toEqual([
				"Bild 1",
				"Bild 2",
				"Bild 3",
				"Bild 4",
			]);
	});

	it("keeps the picture credits the catalogue prints, so the app can show them", () => {
		expect(questions.filter((question) => question.credit).map((question) => question.id)).toEqual([
			"55",
			"70",
			"130",
			"181",
			"216",
			"235",
		]);
		expect(questions.find((question) => question.id === "235")?.credit).toBe(
			"© Bundesregierung/Richard Schulze-Vorberg",
		);
	});

	it("ships no English", () => {
		expect(existsSync(path.join(root, "shared/questions_en.json"))).toBe(false);
		expect(existsSync(path.join(root, "client/public/questions_en.json"))).toBe(false);
		expect(JSON.stringify(questions)).not.toMatch(/translation|"en"/);
	});
});
