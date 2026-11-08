import {theme, toggleTheme} from '@/lib/theme';

describe('theme', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
	});

	it('flips between light and dark, sets data-theme and remembers the choice', () => {
		theme.value = 'light';
		toggleTheme();
		expect(theme.value).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(localStorage.getItem('theme')).toBe('dark');
		toggleTheme();
		expect(theme.value).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
	});

	it('still switches when storage is blocked', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		theme.value = 'light';
		toggleTheme();
		expect(theme.value).toBe('dark');
	});
});
