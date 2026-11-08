import { buildExam, scoreExam } from "../exam";
import { EXAM, idNumber, QUESTION_IDS } from "../question";
import { mulberry32 } from "../rng";

describe("buildExam", () => {
	it("has 30 general and 3 state questions, all different, in a mixed order", () => {
		const exam = buildExam(QUESTION_IDS, mulberry32(1));
		expect(exam).toHaveLength(EXAM.total);
		expect(new Set(exam).size).toBe(EXAM.total);
		expect(exam.filter((id) => idNumber(id)?.part === "general")).toHaveLength(EXAM.general);
		expect(exam.filter((id) => idNumber(id)?.part === "state")).toHaveLength(EXAM.state);
		expect(exam.slice(30).every((id) => idNumber(id)?.part === "state")).toBe(false);
	});

	it("differs between rolls and repeats for the same seed", () => {
		expect(buildExam(QUESTION_IDS, mulberry32(1))).toEqual(buildExam(QUESTION_IDS, mulberry32(1)));
		expect(buildExam(QUESTION_IDS, mulberry32(1))).not.toEqual(buildExam(QUESTION_IDS, mulberry32(2)));
	});

	it("draws about evenly from the whole catalogue over many exams", () => {
		const rng = mulberry32(4);
		const seen = new Set<string>();
		for (let run = 0; run < 100; run += 1) for (const id of buildExam(QUESTION_IDS, rng)) seen.add(id);
		expect(seen.size).toBeGreaterThan(290);
	});
});

describe("scoreExam", () => {
	const questions = Array.from({ length: 33 }, (_, index) => ({ id: String(index + 1), correct: index % 4 }));
	const answerAll = (right: number) =>
		new Map(
			questions.map((question, index) => [
				question.id,
				index < right ? question.correct : (question.correct + 1) % 4,
			]),
		);

	it("passes at 17 of 33 and not at 16", () => {
		expect(scoreExam(questions, answerAll(17))).toMatchObject({ score: 17, passed: true });
		expect(scoreExam(questions, answerAll(16))).toMatchObject({ score: 16, passed: false });
		expect(scoreExam(questions, answerAll(33))).toMatchObject({ score: 33, passed: true, wrong: [] });
	});

	it("lists the wrong questions and counts an unanswered one as wrong", () => {
		const chosen = answerAll(33);
		chosen.delete("5");
		chosen.set("9", (questions[8].correct + 1) % 4);
		const result = scoreExam(questions, chosen);
		expect(result.wrong).toEqual(["5", "9"]);
		expect(result.score).toBe(31);
	});
});
