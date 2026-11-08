import {mount, RouterLinkStub} from '@vue/test-utils';
import {createPinia} from 'pinia';

import i18n from '@/lib/i18n';
import NotFound from '@/views/NotFound.vue';

describe('NotFound', () => {
	it('says so and links home', () => {
		const wrapper = mount(NotFound, {global: {plugins: [createPinia(), i18n], stubs: {RouterLink: RouterLinkStub}}});
		expect(wrapper.find('h1').text()).toBe('Nicht gefunden');
		expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/');
	});
});
