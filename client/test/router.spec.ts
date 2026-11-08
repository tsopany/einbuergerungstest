import {createPinia, setActivePinia} from 'pinia';
import type {RouteLocationNormalized} from 'vue-router';

import router, {requireAuth, routes, scrollBehavior} from '@/router';
import {useAuthStore} from '@/stores/auth';

describe('router', () => {
	it.each([
		['/', 'home'],
		['/p/login', 'login'],
		['/p/frage', 'question'],
		['/p/frage/NW-3', 'question'],
		['/p/pruefung', 'exam'],
		['/p/einstellungen', 'settings'],
		['/p/legal', 'legal'],
		['/anything/else', 'not-found']
	])('resolves %s to %s', (path, name) => {
		expect(router.resolve(path).name).toBe(name);
	});

	it('keeps the catch-all last and the trainer pages protected', () => {
		expect(routes.at(-1)?.name).toBe('not-found');
		expect(routes.filter((route) => route.meta?.auth).map((route) => route.name)).toEqual(['home', 'question', 'exam', 'settings']);
		expect(router.resolve('/p/frage/NW-3').params).toEqual({id: 'NW-3'});
	});

	it('scrolls to the anchor of a hash and to the top otherwise', () => {
		expect(scrollBehavior({hash: '#privacy'} as RouteLocationNormalized)).toEqual({el: '#privacy'});
		expect(scrollBehavior({hash: ''} as RouteLocationNormalized)).toEqual({top: 0});
	});

	describe('requireAuth', () => {
		const protectedRoute = {meta: {auth: true}, fullPath: '/'} as unknown as RouteLocationNormalized;

		beforeEach(() => setActivePinia(createPinia()));

		it('lets public routes through without touching the session', async () => {
			const signIn = vi.spyOn(useAuthStore(), 'signIn');
			expect(await requireAuth({meta: {}} as unknown as RouteLocationNormalized)).toBe(true);
			expect(signIn).not.toHaveBeenCalled();
		});

		it('lets a signed-in user into protected routes', async () => {
			const auth = useAuthStore();
			auth.user = {id: 'u1', email: 'me@example.com'};
			const signIn = vi.spyOn(auth, 'signIn');
			expect(await requireAuth(protectedRoute)).toBe(true);
			expect(signIn).not.toHaveBeenCalled();
		});

		it('restores a session before deciding', async () => {
			vi.spyOn(useAuthStore(), 'signIn').mockResolvedValue({id: 'u1', email: 'me@example.com'});
			expect(await requireAuth(protectedRoute)).toBe(true);
		});

		it('sends visitors without a session to the login page and remembers where they were going', async () => {
			vi.spyOn(useAuthStore(), 'signIn').mockResolvedValue(null);
			expect(await requireAuth(protectedRoute)).toEqual({path: '/p/login', query: {next: '/'}});
		});
	});
});
