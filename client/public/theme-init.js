try {
	document.documentElement.dataset.theme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch {
	// storage blocked: stay on the default theme
}
