import {config, flushPromises, mount, RouterLinkStub} from '@vue/test-utils';
import {createPinia, setActivePinia} from 'pinia';
import {createMemoryHistory, createRouter} from 'vue-router';

import i18n from '@/lib/i18n';
import {useAuthStore} from '@/stores/auth';
import Login from '@/views/Login.vue';

config.global.plugins = [];

async function mountAt(path: string, signedIn: boolean) {
	const pinia = createPinia();
	setActivePinia(pinia);
	const auth = useAuthStore();
	const signIn = vi.spyOn(auth, 'signIn').mockResolvedValue(signedIn ? {id: 'u1', email: 'me@example.com'} : null);
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{path: '/p/login', component: Login},
			{path: '/:p(.*)*', component: {template: '<div />'}}
		]
	});
	await router.push(path);
	await router.isReady();
	const replace = vi.spyOn(router, 'replace');
	const wrapper = mount(Login, {global: {plugins: [pinia, router, i18n], stubs: {RouterLink: RouterLinkStub}}});
	await flushPromises();
	return {wrapper, signIn, replace};
}

describe('Login', () => {
	it('offers Google sign-in to a visitor', async () => {
		const {wrapper, replace} = await mountAt('/p/login', false);
		expect(wrapper.find('.google').attributes('href')).toBe('http://localhost:8115/api/auth/google');
		expect(replace).not.toHaveBeenCalled();
	});

	it('moves a signed-in user on to where they were going', async () => {
		const {replace} = await mountAt('/p/login?next=/p/legal', true);
		expect(replace).toHaveBeenCalledWith('/p/legal');
	});

	it.each([['https://evil.example'], ['//evil.example'], ['']])('does not follow the foreign target %j', async (next) => {
		const {replace} = await mountAt(`/p/login?next=${encodeURIComponent(next)}`, true);
		expect(replace).toHaveBeenCalledWith('/');
	});

	it.each([
		['oauth_failed', 'Die Anmeldung ist fehlgeschlagen'],
		['unverified_email', 'keine bestätigte E-Mail-Adresse']
	])('explains %s without trying to sign in', async (error, text) => {
		const {wrapper, signIn} = await mountAt(`/p/login?error=${error}`, true);
		expect(wrapper.find('.err').text()).toContain(text);
		expect(signIn).not.toHaveBeenCalled();
	});
});
