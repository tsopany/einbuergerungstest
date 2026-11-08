import {config, flushPromises, mount, RouterLinkStub} from '@vue/test-utils';
import {createMemoryHistory, createRouter} from 'vue-router';

import {fail, signedIn, stubApi} from '../_helpers/api';
import i18n from '@/lib/i18n';
import {useAuthStore} from '@/stores/auth';
import Settings from '@/views/Settings.vue';

config.global.plugins = [];

async function mountSettings(routes: Record<string, unknown>) {
	const calls = stubApi(routes);
	const pinia = signedIn();
	const router = createRouter({history: createMemoryHistory(), routes: [{path: '/:p(.*)*', component: {template: '<div />'}}]});
	await router.push('/p/einstellungen');
	const wrapper = mount(Settings, {global: {plugins: [pinia, router, i18n], stubs: {RouterLink: RouterLinkStub}}});
	return {wrapper, calls, router, auth: useAuthStore()};
}

describe('Settings', () => {
	it('names the account and asks before anything is deleted', async () => {
		const {wrapper, calls} = await mountSettings({});
		expect(wrapper.find('.account').text()).toBe('Angemeldet als me@example.com');
		await wrapper.find('.reset .ask').trigger('click');
		expect(wrapper.find('.reset').text()).toContain('Das lässt sich nicht rückgängig machen');
		await wrapper.find('.reset .no').trigger('click');
		expect(wrapper.find('.reset .ask').exists()).toBe(true);
		expect(calls).toEqual([]);
	});

	it('resets the progress after confirmation', async () => {
		const {wrapper, calls} = await mountSettings({'DELETE /api/progress': {success: true}, 'GET /api/seed': {seed: 5}});
		await wrapper.find('.reset .ask').trigger('click');
		await wrapper.find('.reset .yes').trigger('click');
		await flushPromises();
		expect(calls[0]).toMatchObject({method: 'DELETE', path: '/api/progress'});
		expect(wrapper.find('.done').text()).toContain('zurückgesetzt');
		expect(wrapper.find('.reset .ask').exists()).toBe(true);
	});

	it('says so when the reset fails and clears the message on the next try', async () => {
		const {wrapper} = await mountSettings({'DELETE /api/progress': fail(500)});
		await wrapper.find('.reset .ask').trigger('click');
		await wrapper.find('.reset .yes').trigger('click');
		await flushPromises();
		expect(wrapper.find('.err').exists()).toBe(true);
		expect(wrapper.find('.done').exists()).toBe(false);
		await wrapper.find('.delete .ask').trigger('click');
		expect(wrapper.find('.err').exists()).toBe(false);
	});

	it('deletes the account after confirmation and goes to the login page', async () => {
		const {wrapper, calls, router, auth} = await mountSettings({'DELETE /api/me': {success: true}});
		await wrapper.find('.delete .ask').trigger('click');
		expect(wrapper.find('.delete').text()).toContain('alle gespeicherten Daten');
		await wrapper.find('.delete .yes').trigger('click');
		await flushPromises();
		expect(calls[0]).toMatchObject({method: 'DELETE', path: '/api/me'});
		expect(auth.user).toBeNull();
		expect(router.currentRoute.value.fullPath).toBe('/p/login');
	});

	it('keeps the account and says so when the deletion fails', async () => {
		const {wrapper, router, auth} = await mountSettings({'DELETE /api/me': fail(500)});
		await wrapper.find('.delete .ask').trigger('click');
		await wrapper.find('.delete .yes').trigger('click');
		await flushPromises();
		expect(wrapper.find('.err').exists()).toBe(true);
		expect(auth.user).not.toBeNull();
		expect(router.currentRoute.value.fullPath).toBe('/p/einstellungen');
	});
});
