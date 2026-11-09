import {config, flushPromises, mount, RouterLinkStub} from '@vue/test-utils';

import {fail, signedIn, stubApi} from '../_helpers/api';
import i18n from '@/lib/i18n';
import {questionById} from '@/lib/questions';
import ExamReport from '@/views/ExamReport.vue';

config.global.plugins = [];

const key = (id: string) => questionById.get(id)!.correct;
const report = {
	id: 7,
	startedAt: Date.UTC(2026, 10, 8, 10, 0, 0),
	finishedAt: Date.UTC(2026, 10, 8, 10, 37, 9),
	score: 1,
	passed: false,
	questions: [
		{questionId: '1', chosen: key('1'), correctIndex: key('1')},
		{questionId: '2', chosen: (key('2') + 1) % 4, correctIndex: key('2')},
		{questionId: '3', chosen: null, correctIndex: key('3')}
	]
};

async function mountReport(routes: Record<string, unknown>) {
	const calls = stubApi(routes);
	const wrapper = mount(ExamReport, {props: {id: '7'}, global: {plugins: [signedIn(), i18n], stubs: {RouterLink: RouterLinkStub}}});
	await flushPromises();
	return {wrapper, calls};
}

describe('ExamReport', () => {
	it('shows the result, how long it took and every question with the answer given', async () => {
		const {wrapper, calls} = await mountReport({'GET /api/exams/7': report});
		expect(calls[0]).toMatchObject({method: 'GET', path: '/api/exams/7'});
		expect(wrapper.find('.meta').text()).toContain('Dauer 37:09 Min.');
		expect(wrapper.find('.result').text()).toBe('NICHT BESTANDEN');
		expect(wrapper.find('.score').text()).toContain('1');
		const items = wrapper.findAll('.report-item');
		expect(items).toHaveLength(3);
		const targets = wrapper
			.findAllComponents(RouterLinkStub)
			.filter((link) => link.classes('question-link'))
			.map((link) => link.props('to'));
		expect(targets).toEqual(['/p/frage/1', '/p/frage/2', '/p/frage/3']);
		expect(items[0].classes()).toContain('right');
		expect(items[0].find('.right-answer').exists()).toBe(false);
		expect(items[1].classes()).toContain('wrong');
		expect(items[1].find('.given').text()).toContain(questionById.get('2')!.options[(key('2') + 1) % 4]);
		expect(items[1].find('.right-answer').text()).toContain(questionById.get('2')!.options[key('2')]);
		expect(items[2].classes()).toContain('open');
		expect(items[2].find('.given').text()).toContain('keine Antwort');
		expect(items[2].find('.right-answer').exists()).toBe(true);
	});

	it('says so when the report cannot be loaded', async () => {
		const {wrapper} = await mountReport({'GET /api/exams/7': fail(404)});
		expect(wrapper.find('.err').text()).toContain('nicht geladen werden');
		expect(wrapper.find('.report-item').exists()).toBe(false);
	});
});
