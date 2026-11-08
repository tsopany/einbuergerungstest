import { mulberry32, sample, shuffle, weightedPick } from "../rng";

describe("mulberry32", () => {
	it("gives the same sequence for the same seed and a different one for another", () => {
		const first = Array.from({ length: 5 }, mulberry32(7));
		expect(Array.from({ length: 5 }, mulberry32(7))).toEqual(first);
		expect(Array.from({ length: 5 }, mulberry32(8))).not.toEqual(first);
	});

	it("stays in [0, 1) and is spread evenly enough", () => {
		const rng = mulberry32(1);
		const values = Array.from({ length: 10_000 }, rng);
		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
		const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
		expect(mean).toBeGreaterThan(0.48);
		expect(mean).toBeLessThan(0.52);
	});
});

describe("shuffle and sample", () => {
	it("keeps every item once, leaves the input alone and follows the seed", () => {
		const items = Array.from({ length: 50 }, (_, index) => index);
		const mixed = shuffle(items, mulberry32(3));
		expect([...mixed].sort((a, b) => a - b)).toEqual(items);
		expect(mixed).not.toEqual(items);
		expect(items[0]).toBe(0);
		expect(shuffle(items, mulberry32(3))).toEqual(mixed);
	});

	it("handles empty and single lists", () => {
		expect(shuffle([], mulberry32(1))).toEqual([]);
		expect(shuffle(["a"], mulberry32(1))).toEqual(["a"]);
	});

	it("samples distinct items", () => {
		const picked = sample(["a", "b", "c", "d", "e"], 3, mulberry32(2));
		expect(picked).toHaveLength(3);
		expect(new Set(picked).size).toBe(3);
		expect(sample(["a"], 3, mulberry32(2))).toEqual(["a"]);
	});
});

describe("weightedPick", () => {
	it("follows the weights", () => {
		const rng = mulberry32(5);
		const counts = { a: 0, b: 0, c: 0 };
		for (let run = 0; run < 10_000; run += 1) counts[weightedPick(["a", "b", "c"] as const, [1, 3, 0], rng)] += 1;
		expect(counts.c).toBe(0);
		expect(counts.b / counts.a).toBeGreaterThan(2.7);
		expect(counts.b / counts.a).toBeLessThan(3.3);
	});

	it("takes the first or the last item at the edges of the range", () => {
		expect(weightedPick(["a", "b"], [1, 1], () => 0)).toBe("a");
		expect(weightedPick(["a", "b"], [1, 1], () => 0.999999)).toBe("b");
		expect(weightedPick(["a", "b"], [1, 1], () => 1)).toBe("b");
	});
});
