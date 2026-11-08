import {config, flushPromises, mount, RouterLinkStub} from '@vue/test-utils';

import {fail, serverAnswer, signedIn, stubApi} from '../_helpers/api';
import i18n from '@/lib/i18n';
import {questions} from '@/lib/questions';
import Home from '@/views/Home.vue';
import {QUESTION_IDS} from '#shared/ids';

config.global.plugins = [];

async function mountHome(routes: Record<string, unknown>) {
	const calls = stubApi(routes);
	const wrapper = mount(Home, {global: {plugins: [signedIn(), i18n], stubs: {RouterLink: RouterLinkStub}}});
	await flushPromises();
	return {wrapper, calls};
}

const empty = {'GET /api/answers': [], 'GET /api/seed': {seed: 1}, 'GET /api/exams': []};

describe('Home', () => {
	it('shows a loading note first and an error with a retry when the progress cannot be loaded', async () => {
		stubApi({...empty, 'GET /api/answers': fail(500)});
		const wrapper = mount(Home, {global: {plugins: [signedIn(), i18n], stubs: {RouterLink: RouterLinkStub}}});
		expect(wrapper.find('.loading').exists()).toBe(true);
		await flushPromises();
		expect(wrapper.find('.err').text()).toContain('konnte nicht geladen werden');
		stubApi(empty);
		await wrapper.find('.retry').trigger('click');
		await flushPromises();
		expect(wrapper.find('.err').exists()).toBe(false);
		expect(wrapper.find('.phase').exists()).toBe(true);
	});

	it('starts in phase 1 with nothing seen, no rates and no weak questions', async () => {
		const {wrapper} = await mountHome(empty);
		expect(wrapper.find('.phase').text()).toBe('Phase 1: 0/310 Fragen gesehen');
		expect(wrapper.find('.unseen').text()).toBe('310');
		expect(wrapper.find('.overall').text()).toBe('–');
		expect(wrapper.find('.last-week').text()).toBe('–');
		expect(wrapper.find('.none').text()).toBe('Noch keine Antworten.');
		expect(wrapper.find('.counts').text()).toContain('Unsicher');
		expect(wrapper.find('.hint').text()).toContain('4× richtig in Folge');
		expect(wrapper.find('.no-history').exists()).toBe(true);
		expect(wrapper.find('.readiness').text()).toMatch(/Bestehenswahrscheinlichkeit ~\d+ %/);
		expect(wrapper.find('.expected').text()).toMatch(/Erwartet: [\d.]+ von 33 Punkten/);
	});

	it('links to practising, weak questions and the exam', async () => {
		const {wrapper} = await mountHome(empty);
		const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'));
		expect(targets).toContainEqual('/p/frage');
		expect(targets).toContainEqual({path: '/p/frage', query: {mode: 'weak'}});
		expect(targets).toContainEqual({path: '/p/frage', query: {mode: 'easy'}});
		expect(targets).toContainEqual('/p/pruefung');
	});

	it('shows counts, rates, the weakest questions with their box and the exam history', async () => {
		const day = 24 * 60 * 60 * 1000;
		const {wrapper} = await mountHome({
			'GET /api/answers': [
				serverAnswer('1', true, Date.now() - 20 * day),
				serverAnswer('2', false),
				serverAnswer('3', true),
				serverAnswer('3', true),
				serverAnswer('3', true),
				serverAnswer('3', true)
			],
			'GET /api/seed': {seed: 1},
			'GET /api/exams': [
				{id: 2, startedAt: 1, finishedAt: Date.now(), score: 20, passed: true},
				{id: 1, startedAt: 1, finishedAt: Date.now() - day, score: 9, passed: false}
			]
		});
		expect(wrapper.find('.phase').text()).toBe('Phase 1: 3/310 Fragen gesehen');
		expect(wrapper.find('.mastered').text()).toBe('1');
		expect(wrapper.find('.in-progress').text()).toBe('2');
		expect(wrapper.find('.overall').text()).toBe('83 %');
		expect(wrapper.find('.last-week').text()).toBe('80 %');
		const weakest = wrapper.findAll('.weakest li');
		expect(weakest[0].text()).toContain('2 ·');
		expect(weakest[0].text()).toContain('0/4');
		expect(weakest.at(-1)?.text()).toContain('3 ·');
		expect(weakest.at(-1)?.text()).toContain('4/4');
		expect(wrapper.findAll('.history li').map((row) => row.text())).toEqual([expect.stringContaining('20/33 · bestanden'), expect.stringContaining('9/33 · nicht bestanden')]);
	});

	it('shortens long question texts in the weakest list and leaves short ones whole', async () => {
		const long = questions.find((question) => question.text.length > 70)!;
		const short = questions.find((question) => question.text.length <= 70)!;
		const {wrapper} = await mountHome({...empty, 'GET /api/answers': [serverAnswer(long.id, false), serverAnswer(short.id, false)]});
		const links = wrapper.findAll('.weakest .link').map((link) => link.text());
		expect(links.find((text) => text.startsWith(`${long.id} ·`))).toMatch(/…$/);
		expect(links.find((text) => text.startsWith(`${short.id} ·`))).not.toMatch(/…$/);
	});

	it('is in phase 2 once every question has an answer', async () => {
		const {wrapper} = await mountHome({...empty, 'GET /api/answers': QUESTION_IDS.map((id) => serverAnswer(id, true))});
		expect(wrapper.find('.phase').text()).toBe('Phase 2: gezieltes Üben');
		expect(wrapper.find('.unseen').text()).toBe('0');
	});
});
