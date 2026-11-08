import {mount} from '@vue/test-utils';

import App from '@/App.vue';

describe('App', () => {
	it('renders the routed page', () => {
		const wrapper = mount(App, {global: {stubs: {RouterView: {template: '<p class="view" />'}}}});
		expect(wrapper.find('.view').exists()).toBe(true);
	});
});
