import {ref} from 'vue';

export type Theme = 'light' | 'dark';

const KEY = 'theme';

// public/theme-init.js sets data-theme before first paint; read it back so the icon matches.
export const theme = ref<Theme>(globalThis.document?.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function toggleTheme(): void {
	theme.value = theme.value === 'dark' ? 'light' : 'dark';
	document.documentElement.dataset.theme = theme.value;
	try {
		localStorage.setItem(KEY, theme.value);
	} catch {
		// storage blocked: the choice lasts until reload
	}
}
