import {
	BOX_WEIGHTS,
	EASY_MIN_BOX,
	COOLDOWN_FACTOR,
	COOLDOWN_MS,
	deckOrder,
	phaseOf,
	pickNext,
	RECENT_COUNT,
	recentIds,
	REVIEW_CHANCE,
	REVIEW_DELAY_MS,
	reviewPile,
	weightOf,
} from "../picker";
import { QUESTION_IDS } from "../question";
import { mulberry32 } from "../rng";
import { deriveStates, type Answer } from "../state";

const HOUR = 60 * 60 * 1000;
const NOW = 1_000 * HOUR;
const IDS = ["1", "2", "3", "4", "5", "6"];
const answer = (questionId: string, correct: boolean, answeredAt: number): Answer => ({
	questionId,
	correct,
	answeredAt,
});
const always = (value: number) => () => value;

describe("deckOrder", () => {
	it("is a fixed shuffle of every question for a seed", () => {
		const deck = deckOrder(QUESTION_IDS, 42);
		expect([...deck].sort()).toEqual([...QUESTION_IDS].sort());
		expect(deck).not.toEqual([...QUESTION_IDS]);
		expect(deckOrder(QUESTION_IDS, 42)).toEqual(deck);
		expect(deckOrder(QUESTION_IDS, 43)).not.toEqual(deck);
	});
});

describe("phaseOf", () => {
	it("is coverage until every question has an answer", () => {
		expect(phaseOf(IDS, deriveStates([]))).toBe("coverage");
		expect(phaseOf(IDS, deriveStates(IDS.slice(1).map((id) => answer(id, true, 1))))).toBe("coverage");
		expect(phaseOf(IDS, deriveStates(IDS.map((id) => answer(id, true, 1))))).toBe("weighted");
	});
});

describe("reviewPile", () => {
	it("holds wrong answers older than two hours, oldest first, and drops a question once it is right", () => {
		const states = deriveStates([
			answer("1", false, NOW - 5 * HOUR),
			answer("2", false, NOW - 3 * HOUR),
			answer("3", false, NOW - REVIEW_DELAY_MS + 1),
			answer("4", true, NOW - 9 * HOUR),
			answer("5", false, NOW - 9 * HOUR),
			answer("5", true, NOW - 8 * HOUR),
		]);
		expect(reviewPile(states, NOW)).toEqual(["1", "2"]);
		expect(reviewPile(states, NOW + HOUR)).toEqual(["1", "2", "3"]);
	});
});

describe("coverage phase", () => {
	const pick = (answers: Answer[], rng = always(0.99), ids = IDS) =>
		pickNext({ ids, answers, seed: 9, now: NOW, rng });

	it("serves every question exactly once in deck order, with no repeats", () => {
		const deck = deckOrder(IDS, 9);
		const answers: Answer[] = [];
		const served: string[] = [];
		for (let step = 0; step < IDS.length; step += 1) {
			const id = pick(answers);
			served.push(id);
			answers.push(answer(id, true, NOW - (IDS.length - step) * HOUR));
		}
		expect(served).toEqual(deck);
	});

	it("takes a question from the review pile about a third of the time, never one asked wrong under two hours ago", () => {
		const answers = [answer("1", false, NOW - 3 * HOUR), answer("2", false, NOW - HOUR)];
		expect(pick(answers, always(REVIEW_CHANCE - 0.001))).toBe("1");
		expect(pick(answers, always(REVIEW_CHANCE))).not.toBe("1");
		const rng = mulberry32(11);
		const picks = Array.from({ length: 6000 }, () => pick(answers, rng));
		const reviews = picks.filter((id) => id === "1").length / picks.length;
		expect(reviews).toBeGreaterThan(0.3);
		expect(reviews).toBeLessThan(0.37);
		expect(picks.includes("2")).toBe(false);
	});

	it("serves the next unseen question when the review pile is empty, whatever the dice say", () => {
		const unseen = pick([], always(0));
		expect(IDS).toContain(unseen);
		expect(pick([answer("1", true, NOW - HOUR)], always(0))).not.toBe("1");
	});

	it("goes on with unseen questions even when the review pile is not empty and the dice say no", () => {
		const answers = [answer("1", false, NOW - 5 * HOUR)];
		expect(pick(answers, always(0.99))).not.toBe("1");
	});
});

describe("weightOf", () => {
	const state = (box: number, lastAnsweredAt: number) => ({
		attempts: 1,
		correctCount: 0,
		lastAnsweredAt,
		lastResult: false,
		box,
	});

	it("follows the box and counts an unseen question like box 0", () => {
		expect(BOX_WEIGHTS).toEqual([16, 8, 4, 2, 0.5]);
		expect([0, 1, 2, 3, 4].map((box) => weightOf(state(box, 0), NOW))).toEqual([16, 8, 4, 2, 0.5]);
		expect(weightOf(undefined, NOW)).toBe(16);
	});

	it("cools a question answered in the last 24 hours down to a tenth", () => {
		expect(weightOf(state(0, NOW - COOLDOWN_MS + 1), NOW)).toBe(16 * COOLDOWN_FACTOR);
		expect(weightOf(state(0, NOW - COOLDOWN_MS), NOW)).toBe(16);
	});
});

describe("recentIds", () => {
	it("holds the ten last answered questions, newest first, however the answers are ordered", () => {
		const answers = Array.from({ length: 15 }, (_, index) => answer(`${index + 1}`, true, index));
		const recent = recentIds([...answers].reverse());
		expect(RECENT_COUNT).toBe(10);
		expect([...recent].sort((a, b) => Number(a) - Number(b))).toEqual([
			"6",
			"7",
			"8",
			"9",
			"10",
			"11",
			"12",
			"13",
			"14",
			"15",
		]);
	});

	it("keeps the order of answers given at the same moment", () => {
		const recent = recentIds([answer("1", true, 5), answer("2", true, 5)]);
		expect(recent.size).toBe(2);
	});
});

describe("weighted phase", () => {
	const ids = Array.from({ length: 30 }, (_, index) => `${index + 1}`);
	const longAgo = NOW - 100 * HOUR;
	const seen = (id: string, correct: boolean, at = longAgo) => answer(id, correct, at);

	it("never picks one of the last ten answered questions", () => {
		const answers = [...ids.map((id, index) => seen(id, false, longAgo + index)), ...[]];
		const recent = recentIds(answers);
		const rng = mulberry32(3);
		for (let run = 0; run < 500; run += 1)
			expect(recent.has(pickNext({ ids, answers, seed: 1, now: NOW, rng }))).toBe(false);
	});

	it("shows weak questions far more often than mastered ones", () => {
		const weak = ids.map((id) => (Number(id) <= 15 ? seen(id, false) : seen(id, true)));
		const mastered = ids
			.filter((id) => Number(id) > 15)
			.flatMap((id) => [seen(id, true, longAgo + 1), seen(id, true, longAgo + 2), seen(id, true, longAgo + 3)]);
		const answers = [...weak, ...mastered];
		const rng = mulberry32(21);
		const picks = Array.from({ length: 4000 }, () => Number(pickNext({ ids, answers, seed: 1, now: NOW, rng })));
		const weakShare = picks.filter((id) => id <= 15).length / picks.length;
		expect(weakShare).toBeGreaterThan(0.9);
	});

	it("cools down a question answered in the last 24 hours", () => {
		const answers = ids.map((id) => (id === "1" ? seen(id, false, NOW - 20 * HOUR) : seen(id, false)));
		const rng = mulberry32(5);
		const picks = Array.from({ length: 3000 }, () => pickNext({ ids, answers, seed: 1, now: NOW, rng }));
		const share = picks.filter((id) => id === "1").length / picks.length;
		expect(share).toBeLessThan(0.01);
	});

	it("switches from coverage to weighted when the last unseen question is answered", () => {
		const almost = ids.slice(1).map((id) => seen(id, true));
		const before = pickNext({ ids, answers: almost, seed: 1, now: NOW, rng: always(0.99) });
		expect(before).toBe("1");
		const after = pickNext({
			ids,
			answers: [...almost, seen("1", true, NOW - HOUR)],
			seed: 1,
			now: NOW,
			rng: always(0.5),
		});
		expect(ids).toContain(after);
		expect(after).not.toBe("1");
	});

	it("falls back to every question when the exclusions would leave none", () => {
		const few = ["1", "2"];
		const answers = [seen("1", true), seen("2", true, longAgo + 1)];
		const picked = pickNext({ ids: few, answers, seed: 1, now: NOW, rng: always(0.5) });
		expect(few).toContain(picked);
	});
});

describe("weak mode", () => {
	it("uses the weighted rules even while questions are unseen, and gives unseen ones the top weight", () => {
		const answers = [
			answer("1", true, NOW - 50 * HOUR),
			answer("1", true, NOW - 49 * HOUR),
			answer("1", true, NOW - 48 * HOUR),
			answer("1", true, NOW - 47 * HOUR),
		];
		const rng = mulberry32(8);
		const picks = Array.from({ length: 2000 }, () =>
			pickNext({ ids: IDS, answers, seed: 1, now: NOW, rng, mode: "weak" }),
		);
		expect(picks.filter((id) => id === "1").length).toBeLessThan(40);
		expect(new Set(picks).size).toBeGreaterThan(3);
	});
});

describe("easy mode", () => {
	const knownWell = (id: string, at: number) =>
		Array.from({ length: EASY_MIN_BOX }, (_, step) => answer(id, true, at + step));

	it("serves only questions in a high box, never one of the latest answers", () => {
		const answers = [
			...knownWell("1", NOW - 80 * HOUR),
			...knownWell("2", NOW - 79 * HOUR),
			answer("3", true, NOW - 78 * HOUR),
			answer("4", false, NOW - 77 * HOUR),
			...Array.from({ length: RECENT_COUNT }, (_, step) =>
				answer(`${5 + (step % 2)}`, false, NOW - 70 * HOUR + step),
			),
		];
		const rng = mulberry32(5);
		const picks = new Set(
			Array.from({ length: 200 }, () => pickNext({ ids: IDS, answers, seed: 1, now: NOW, rng, mode: "easy" })),
		);
		expect([...picks].sort((a, b) => a.localeCompare(b))).toEqual(["1", "2"]);
	});

	it("leaves out recent answers and falls back to the normal pick when nothing qualifies", () => {
		const answers = knownWell("1", NOW - 80 * HOUR);
		const rng = always(0);
		const base = { ids: IDS, answers: [], seed: 1, now: NOW, rng };
		expect(pickNext({ ...base, mode: "easy" })).toBe(pickNext({ ...base, mode: "practice" }));
		const recentOnly = pickNext({ ...base, answers, mode: "easy" });
		expect(recentOnly).toBe(pickNext({ ...base, answers, mode: "practice" }));
	});
});
