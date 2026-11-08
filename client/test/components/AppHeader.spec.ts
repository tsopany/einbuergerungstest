import {config, flushPromises, mount, RouterLinkStub} from '@vue/test-utils';
import {createPinia, setActivePinia} from 'pinia';
import {createMemoryHistory, createRouter} from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
import i18n from '@/lib/i18n';
import {theme} from '@/lib/theme';
import {useAuthStore} from '@/stores/auth';

config.global.plugins = [];

function mountHeader() {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router = createRouter({history: createMemoryHistory(), routes: [{path: '/:p(.*)*', component: {template: '<div />'}}]});
	const wrapper = mount(AppHeader, {global: {plugins: [pinia, router, i18n], stubs: {RouterLink: RouterLinkStub}}});
	return {wrapper, auth: useAuthStore(), router};
}

describe('AppHeader', () => {
	it('offers sign-in to a visitor', () => {
		const {wrapper} = mountHeader();
		expect(wrapper.find('.signin').exists()).toBe(true);
		expect(wrapper.find('.signout').exists()).toBe(false);
		expect(wrapper.find('.settings').exists()).toBe(false);
		expect(wrapper.find('.legal').exists()).toBe(true);
	});

	it('offers sign-out to a signed-in user and returns to the login page', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, status: 200, statusText: 'OK', json: async () => ({success: true})}));
		const {wrapper, auth, router} = mountHeader();
		auth.user = {id: 'u1', email: 'me@example.com'};
		await wrapper.vm.$nextTick();
		expect(wrapper.find('.signin').exists()).toBe(false);
		expect(wrapper.find('.settings').exists()).toBe(true);
		expect(wrapper.find('.who').text()).toBe('me@example.com');
		auth.user = {id: 'u1', email: 'me@example.com', name: 'Ada'};
		await wrapper.vm.$nextTick();
		expect(wrapper.find('.who').text()).toBe('Ada');
		await wrapper.find('.signout').trigger('click');
		await flushPromises();
		expect(auth.user).toBeNull();
		expect(router.currentRoute.value.fullPath).toBe('/p/login');
	});

	it('says so in the demo', () => {
		vi.stubEnv('VITE_DEMO', 'true');
		const {wrapper} = mountHeader();
		expect(wrapper.text()).toContain('Demo: nichts wird gespeichert');
		vi.unstubAllEnvs();
		vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8115');
	});

	it('toggles the theme with the last control in the bar', async () => {
		theme.value = 'light';
		const {wrapper} = mountHeader();
		const buttons = wrapper.findAll('nav > *');
		expect(buttons[buttons.length - 1].classes()).toContain('theme');
		await wrapper.find('.theme').trigger('click');
		expect(theme.value).toBe('dark');
	});
});
