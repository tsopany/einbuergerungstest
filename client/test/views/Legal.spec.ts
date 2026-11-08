import {mount, RouterLinkStub} from '@vue/test-utils';
import {createPinia} from 'pinia';

import i18n from '@/lib/i18n';
import {CONTACT_EMAIL} from '@/lib/legal';
import Legal from '@/views/Legal.vue';

describe('Legal', () => {
	it('shows every privacy section and a mailto link only on the contact section', () => {
		const wrapper = mount(Legal, {global: {plugins: [createPinia(), i18n], stubs: {RouterLink: RouterLinkStub}}});
		expect(wrapper.findAll('.section').map((section) => section.attributes('data-section'))).toEqual(['who', 'data', 'processors', 'retention', 'rights', 'contact']);
		expect(wrapper.findAll('.contact')).toHaveLength(1);
		expect(wrapper.find('.contact').attributes('href')).toBe(`mailto:${CONTACT_EMAIL}`);
		expect(wrapper.find('#privacy h2').text()).toBe('Datenschutz');
	});
});
