import { EXAM, idNumber } from "./ids";
import type { Question } from "./question";
import { sample, shuffle, type Rng } from "./rng";

/** 30 random general + 3 random state questions, shuffled together. */
export function buildExam(ids: readonly string[], rng: Rng): string[] {
	const general = ids.filter((id) => idNumber(id)?.part === "general");
	const state = ids.filter((id) => idNumber(id)?.part === "state");
	return shuffle([...sample(general, EXAM.general, rng), ...sample(state, EXAM.state, rng)], rng);
}

export type ExamResult = { score: number; passed: boolean; wrong: string[] };

/** `chosen` holds the final answer per question; a question left open counts as wrong. */
export function scoreExam(
	questions: readonly Pick<Question, "id" | "correct">[],
	chosen: ReadonlyMap<string, number>,
): ExamResult {
	const wrong = questions
		.filter((question) => chosen.get(question.id) !== question.correct)
		.map((question) => question.id);
	const score = questions.length - wrong.length;
	return { score, passed: score >= EXAM.passMark, wrong };
}
