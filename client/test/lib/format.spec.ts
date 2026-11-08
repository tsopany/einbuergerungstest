import {formatDuration} from '@/lib/format';

describe('formatDuration', () => {
	it('shows minutes and seconds with two digits', () => {
		expect(formatDuration(0)).toBe('00:00');
		expect(formatDuration(65_400)).toBe('01:05');
		expect(formatDuration(37 * 60_000 + 9_000)).toBe('37:09');
	});

	it('never goes below zero', () => {
		expect(formatDuration(-5_000)).toBe('00:00');
	});
});
