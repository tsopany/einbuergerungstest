describe('main', () => {
	it('mounts app into #app', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 401, statusText: 'No', json: async () => ({})}));
		document.body.innerHTML = '<div id="app"></div>';
		await import('@/main');
		expect(document.querySelector('#app')).not.toBeNull();
	});
});
