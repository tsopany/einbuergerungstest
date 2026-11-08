import { mulberry32, shuffle, weightedPick, type Rng } from "./rng";
import { deriveStates, type Answer, type QuestionState } from "./state";

const HOUR_MS = 60 * 60 * 1000;

export const REVIEW_CHANCE = 1 / 3;
export const REVIEW_DELAY_MS = 2 * HOUR_MS;
export const COOLDOWN_MS = 24 * HOUR_MS;
export const COOLDOWN_FACTOR = 0.1;
export const RECENT_COUNT = 10;
/** Lowest Leitner box that counts as known well for `easy` mode. */
export const EASY_MIN_BOX = 3;
/** Weight by Leitner box; an unseen question weighs like box 0. */
export const BOX_WEIGHTS = [16, 8, 4, 2, 0.5] as const;

export type Phase = "coverage" | "weighted";
/** `practice` follows the phases; `weak` always uses the weighted rules; `easy` serves questions already known well. */
export type Mode = "practice" | "weak" | "easy";

export type PickInput = {
	ids: readonly string[];
	answers: readonly Answer[];
	seed: number;
	now: number;
	rng: Rng;
	mode?: Mode;
};

export const phaseOf = (ids: readonly string[], states: ReadonlyMap<string, QuestionState>): Phase =>
	ids.every((id) => states.has(id)) ? "weighted" : "coverage";

/** The fixed order in which unseen questions are served, set once by the user's seed. */
export const deckOrder = (ids: readonly string[], seed: number): string[] => shuffle(ids, mulberry32(seed));

/** Questions last answered wrong at least two hours ago, oldest first. */
export function reviewPile(states: ReadonlyMap<string, QuestionState>, now: number): string[] {
	return [...states]
		.filter(([, state]) => !state.lastResult && now - state.lastAnsweredAt >= REVIEW_DELAY_MS)
		.sort((a, b) => a[1].lastAnsweredAt - b[1].lastAnsweredAt)
		.map(([id]) => id);
}

export function weightOf(state: QuestionState | undefined, now: number): number {
	const weight = BOX_WEIGHTS[state?.box ?? 0];
	return state && now - state.lastAnsweredAt < COOLDOWN_MS ? weight * COOLDOWN_FACTOR : weight;
}

/** The ids of the last answers, newest first, that must not come up again right away. */
export const recentIds = (answers: readonly Answer[]): Set<string> =>
	new Set(
		answers
			.map((answer, index) => ({ answer, index }))
			.sort((a, b) => b.answer.answeredAt - a.answer.answeredAt || b.index - a.index)
			.slice(0, RECENT_COUNT)
			.map(({ answer }) => answer.questionId),
	);

export function pickNext({ ids, answers, seed, now, rng, mode = "practice" }: PickInput): string {
	const states = deriveStates(answers);
	if (mode === "easy") {
		const recent = recentIds(answers);
		const known = ids.filter((id) => (states.get(id)?.box ?? 0) >= EASY_MIN_BOX && !recent.has(id));
		if (known.length) return known[Math.floor(rng() * known.length)];
	}
	if (mode !== "weak" && phaseOf(ids, states) === "coverage") return pickCoverage(ids, states, seed, now, rng);
	return pickWeighted(ids, states, answers, now, rng);
}

function pickCoverage(
	ids: readonly string[],
	states: ReadonlyMap<string, QuestionState>,
	seed: number,
	now: number,
	rng: Rng,
): string {
	const pile = reviewPile(states, now);
	if (pile.length && rng() < REVIEW_CHANCE) return pile[0];
	return deckOrder(ids, seed).find((id) => !states.has(id)) as string;
}

function pickWeighted(
	ids: readonly string[],
	states: ReadonlyMap<string, QuestionState>,
	answers: readonly Answer[],
	now: number,
	rng: Rng,
): string {
	const recent = recentIds(answers);
	const open = ids.filter((id) => !recent.has(id));
	const pool = open.length ? open : ids;
	return weightedPick(
		pool,
		pool.map((id) => weightOf(states.get(id), now)),
		rng,
	);
}
