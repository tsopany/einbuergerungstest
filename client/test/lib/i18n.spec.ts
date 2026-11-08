import i18n from '@/lib/i18n';

describe('i18n', () => {
	it('is German only', () => {
		expect(i18n.global.locale.value).toBe('de');
		expect(Object.keys(i18n.global.messages.value)).toEqual(['de']);
		expect(i18n.global.t('app.name')).toBe('Einbürgerungstest');
	});
});
