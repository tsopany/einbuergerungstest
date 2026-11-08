export type Rng = () => number;

/** Small seeded generator (mulberry32): the same seed gives the same sequence. */
export function mulberry32(seed: number): Rng {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
	const out = [...items];
	for (let index = out.length - 1; index > 0; index -= 1) {
		const other = Math.floor(rng() * (index + 1));
		[out[index], out[other]] = [out[other], out[index]];
	}
	return out;
}

export const sample = <T>(items: readonly T[], count: number, rng: Rng): T[] => shuffle(items, rng).slice(0, count);

export function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: Rng): T {
	let remaining = rng() * weights.reduce((sum, weight) => sum + weight, 0);
	for (let index = 0; index < items.length; index += 1) {
		remaining -= weights[index];
		if (remaining < 0) return items[index];
	}
	return items[items.length - 1];
}
