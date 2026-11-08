import { deriveStates, isMastered, MAX_BOX, type Answer } from "../state";

const answer = (questionId: string, correct: boolean, answeredAt: number): Answer => ({
	questionId,
	correct,
	answeredAt,
});

describe("deriveStates", () => {
	it("has no state for a question that was never answered", () => {
		expect(deriveStates([]).size).toBe(0);
	});

	it("counts attempts and right answers and remembers the last one", () => {
		const states = deriveStates([answer("1", true, 10), answer("1", false, 20), answer("1", true, 30)]);
		expect(states.get("1")).toEqual({ attempts: 3, correctCount: 2, lastAnsweredAt: 30, lastResult: true, box: 1 });
	});

	it("moves up a box per right answer, up to the top, and back to 0 on a wrong one", () => {
		const right = (count: number) => Array.from({ length: count }, (_, index) => answer("1", true, index));
		expect(deriveStates(right(1)).get("1")?.box).toBe(1);
		expect(deriveStates(right(4)).get("1")?.box).toBe(MAX_BOX);
		expect(deriveStates(right(9)).get("1")?.box).toBe(MAX_BOX);
		expect(deriveStates([...right(4), answer("1", false, 100)]).get("1")?.box).toBe(0);
	});

	it("reads the answers oldest first whatever order they arrive in, and keeps the order of ties", () => {
		const late = answer("1", false, 30);
		const early = answer("1", true, 10);
		expect(deriveStates([late, early]).get("1")).toMatchObject({ lastResult: false, box: 0 });
		const tied = deriveStates([answer("2", true, 5), answer("2", false, 5)]);
		expect(tied.get("2")).toMatchObject({ lastResult: false, box: 0 });
	});

	it("keeps questions apart", () => {
		const states = deriveStates([answer("1", true, 1), answer("NW-1", false, 2)]);
		expect(states.get("1")?.box).toBe(1);
		expect(states.get("NW-1")?.box).toBe(0);
	});

	it("is the same as rebuilding it from the full history again", () => {
		const history = [answer("1", true, 1), answer("2", false, 2), answer("1", true, 3)];
		expect(deriveStates(history)).toEqual(deriveStates([...history]));
	});
});

describe("isMastered", () => {
	it("is true only in the top box", () => {
		const four = deriveStates(Array.from({ length: 4 }, (_, index) => answer("1", true, index))).get("1");
		const three = deriveStates(Array.from({ length: 3 }, (_, index) => answer("1", true, index))).get("1");
		expect(isMastered(four)).toBe(true);
		expect(isMastered(three)).toBe(false);
		expect(isMastered(undefined)).toBe(false);
	});
});
