import { EXAM, compareIds, idNumber } from "./ids";
import { type Rng } from "./rng";
import { phaseOf, type Phase } from "./picker";
import { deriveStates, isMastered, type Answer, type QuestionState } from "./state";

const DAY_MS = 24 * 60 * 60 * 1000;
export const GUESS_CHANCE = 0.25;
export const SIMULATIONS = 10_000;

export type Summary = { mastered: number; inProgress: number; unseen: number; seen: number; phase: Phase };

export function summarize(ids: readonly string[], states: ReadonlyMap<string, QuestionState>): Summary {
	const mastered = ids.filter((id) => isMastered(states.get(id))).length;
	const seen = ids.filter((id) => states.has(id)).length;
	return { mastered, inProgress: seen - mastered, unseen: ids.length - seen, seen, phase: phaseOf(ids, states) };
}

export type Accuracy = { correct: number; total: number; rate: number | null };

const accuracyOf = (answers: readonly Answer[]): Accuracy => {
	const correct = answers.filter((answer) => answer.correct).length;
	return { correct, total: answers.length, rate: answers.length ? correct / answers.length : null };
};

export const accuracy = (answers: readonly Answer[], now: number): { overall: Accuracy; lastWeek: Accuracy } => ({
	overall: accuracyOf(answers),
	lastWeek: accuracyOf(answers.filter((answer) => now - answer.answeredAt < 7 * DAY_MS)),
});

/** Seen questions, weakest first: lowest box, then highest share of wrong answers, then catalogue order. */
export function weakest(ids: readonly string[], states: ReadonlyMap<string, QuestionState>, limit = 10): string[] {
	const errorRate = (state: QuestionState) => 1 - state.correctCount / state.attempts;
	return ids
		.filter((id) => states.has(id))
		.sort((a, b) => {
			const left = states.get(a) as QuestionState;
			const right = states.get(b) as QuestionState;
			return left.box - right.box || errorRate(right) - errorRate(left) || compareIds(a, b);
		})
		.slice(0, limit);
}

/** Chance of getting a question right: (right + 1) / (tries + 2); an unseen one is a guess. */
export const chanceOf = (state: QuestionState | undefined): number =>
	state ? (state.correctCount + 1) / (state.attempts + 2) : GUESS_CHANCE;

export type Readiness = { probability: number; expectedScore: number };

/** Right answers among `count` questions drawn at random: a partial shuffle, so a run costs `count` swaps, not a full pass. */
function drawnScore(chances: number[], count: number, rng: Rng): number {
	let score = 0;
	for (let index = 0; index < count; index += 1) {
		const pick = index + Math.floor(rng() * (chances.length - index));
		[chances[index], chances[pick]] = [chances[pick], chances[index]];
		if (rng() < chances[index]) score += 1;
	}
	return score;
}

/** Monte Carlo over random exams (30 general + 3 state questions): how likely 17 or more are right. */
export function readiness(ids: readonly string[], answers: readonly Answer[], rng: Rng, runs = SIMULATIONS): Readiness {
	const states = deriveStates(answers);
	const chances = (part: "general" | "state") =>
		ids.filter((id) => idNumber(id)?.part === part).map((id) => chanceOf(states.get(id)));
	const general = chances("general");
	const state = chances("state");
	let passed = 0;
	let total = 0;
	for (let run = 0; run < runs; run += 1) {
		const score = drawnScore(general, EXAM.general, rng) + drawnScore(state, EXAM.state, rng);
		total += score;
		if (score >= EXAM.passMark) passed += 1;
	}
	return { probability: passed / runs, expectedScore: total / runs };
}
