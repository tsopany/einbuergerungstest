import { QUESTION_IDS } from "../question";
import { mulberry32 } from "../rng";
import { deriveStates, type Answer } from "../state";
import { accuracy, chanceOf, GUESS_CHANCE, readiness, summarize, weakest } from "../stats";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const answer = (questionId: string, correct: boolean, answeredAt = NOW - DAY): Answer => ({
	questionId,
	correct,
	answeredAt,
});

describe("summarize", () => {
	it("splits the questions into mastered, in progress and unseen and names the phase", () => {
		const answers = [
			...Array.from({ length: 4 }, (_, index) => answer("1", true, index)),
			answer("2", false),
			answer("3", true),
		];
		const summary = summarize(QUESTION_IDS, deriveStates(answers));
		expect(summary).toEqual({ mastered: 1, inProgress: 2, unseen: 307, seen: 3, phase: "coverage" });
	});

	it("is in the weighted phase once everything was seen", () => {
		const all = QUESTION_IDS.map((id) => answer(id, true));
		expect(summarize(QUESTION_IDS, deriveStates(all))).toMatchObject({ unseen: 0, phase: "weighted" });
	});
});

describe("accuracy", () => {
	it("has no rate without answers", () => {
		expect(accuracy([], NOW)).toEqual({
			overall: { correct: 0, total: 0, rate: null },
			lastWeek: { correct: 0, total: 0, rate: null },
		});
	});

	it("counts overall and over the last seven days", () => {
		const answers = [
			answer("1", true, NOW - 8 * DAY),
			answer("1", false, NOW - 8 * DAY),
			answer("2", true, NOW - 6 * DAY),
			answer("3", true, NOW - DAY),
			answer("4", false, NOW - DAY),
		];
		const result = accuracy(answers, NOW);
		expect(result.overall).toEqual({ correct: 3, total: 5, rate: 0.6 });
		expect(result.lastWeek).toEqual({ correct: 2, total: 3, rate: 2 / 3 });
	});
});

describe("weakest", () => {
	it("lists seen questions by lowest box, then by share of wrong answers, then by catalogue order", () => {
		const answers = [
			answer("3", false, 1),
			answer("2", false, 1),
			answer("2", false, 2),
			answer("10", false, 1),
			answer("NW-1", false, 1),
			answer("9", true, 1),
			answer("9", true, 2),
			answer("7", false, 1),
			answer("7", true, 2),
			answer("7", false, 3),
		];
		const states = deriveStates(answers);
		expect(weakest(QUESTION_IDS, states)).toEqual(["2", "3", "10", "NW-1", "7", "9"]);
		expect(weakest(QUESTION_IDS, states, 2)).toEqual(["2", "3"]);
	});

	it("leaves out questions that were never answered", () => {
		expect(weakest(QUESTION_IDS, deriveStates([]))).toEqual([]);
	});
});

describe("chanceOf", () => {
	it("is (right + 1) / (tries + 2), and a guess for an unseen question", () => {
		expect(chanceOf(undefined)).toBe(GUESS_CHANCE);
		expect(chanceOf(deriveStates([answer("1", true)]).get("1"))).toBeCloseTo(2 / 3);
		expect(chanceOf(deriveStates([answer("1", false), answer("1", false)]).get("1"))).toBeCloseTo(0.25);
		expect(chanceOf(deriveStates(Array.from({ length: 8 }, () => answer("1", true))).get("1"))).toBeCloseTo(0.9);
	});
});

describe("readiness", () => {
	it("is very unlikely to pass by guessing alone, with an expected score near a quarter", () => {
		const result = readiness(QUESTION_IDS, [], mulberry32(1));
		expect(result.probability).toBeLessThan(0.02);
		expect(result.expectedScore).toBeGreaterThan(7.5);
		expect(result.expectedScore).toBeLessThan(9);
	});

	it("is near certain when everything was answered right many times", () => {
		const answers = QUESTION_IDS.flatMap((id) => Array.from({ length: 10 }, () => answer(id, true)));
		const result = readiness(QUESTION_IDS, answers, mulberry32(1));
		expect(result.probability).toBeGreaterThan(0.99);
		expect(result.expectedScore).toBeGreaterThan(26);
	});

	it("falls as the answers get worse", () => {
		const mixed = (rightEvery: number) =>
			QUESTION_IDS.flatMap((id, index) =>
				Array.from({ length: 4 }, (_, n) => answer(id, (index + n) % rightEvery !== 0)),
			);
		const good = readiness(QUESTION_IDS, mixed(10), mulberry32(2), 2000);
		const poor = readiness(QUESTION_IDS, mixed(2), mulberry32(2), 2000);
		expect(good.expectedScore).toBeGreaterThan(poor.expectedScore);
		expect(good.probability).toBeGreaterThan(poor.probability);
	});

	it("repeats for the same seed and runs the default 10,000 simulations", () => {
		expect(readiness(QUESTION_IDS, [], mulberry32(9), 500)).toEqual(
			readiness(QUESTION_IDS, [], mulberry32(9), 500),
		);
		expect(readiness(QUESTION_IDS, [], mulberry32(9)).probability * 10_000).toBeCloseTo(
			Math.round(readiness(QUESTION_IDS, [], mulberry32(9)).probability * 10_000),
		);
	});
});
