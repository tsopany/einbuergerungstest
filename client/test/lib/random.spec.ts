import {random} from '@/lib/random';

describe('random', () => {
	it('stays in [0, 1) and varies', () => {
		const values = Array.from({length: 200}, random);
		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
		expect(new Set(values).size).toBeGreaterThan(150);
	});
});
