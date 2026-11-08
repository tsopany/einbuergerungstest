import {CONTACT_EMAIL} from '@/lib/legal';

describe('legal', () => {
	it('has a contact address', () => {
		expect(CONTACT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+$/);
	});
});
