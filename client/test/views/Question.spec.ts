import {config, flushPromises, mount, RouterLinkStub} from '@vue/test-utils';
import {createMemoryHistory, createRouter} from 'vue-router';

import {fail, serverAnswer, signedIn, stubApi} from '../_helpers/api';
import i18n from '@/lib/i18n';
import {setShuffleAnswers} from '@/lib/order';
import {questionById} from '@/lib/questions';
import {useProgressStore} from '@/stores/progress';
import Question from '@/views/Question.vue';

config.global.plugins = [];

const key = (id: string) => questionById.get(id)!.correct;
const base = {'GET /api/answers': [serverAnswer('2', true)], 'GET /api/seed': {seed: 1}, 'GET /api/exams': []};

async function mountQuestion(path: string, id: string | undefined, routes: Record<string, unknown> = {}) {
	const calls = stubApi({...base, ...routes});
	const pinia = signedIn();
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{path: '/p/frage/:id?', name: 'question', component: Question, props: true},
			{path: '/:p(.*)*', component: {template: '<div />'}}
		]
	});
	await router.push(path);
	const replace = vi.spyOn(router, 'replace');
	const wrapper = mount(Question, {props: {id}, global: {plugins: [pinia, router, i18n], stubs: {RouterLink: RouterLinkStub}}});
	await flushPromises();
	return {wrapper, calls, router, replace, progress: useProgressStore()};
}

describe('Question', () => {
	it('shows an error with a retry when the progress cannot be loaded', async () => {
		const {wrapper} = await mountQuestion('/p/frage/1', '1', {'GET /api/seed': fail(500)});
		expect(wrapper.find('.err').text()).toContain('konnte nicht geladen werden');
		stubApi(base);
		await wrapper.find('.retry').trigger('click');
		await flushPromises();
		expect(wrapper.find('.question-text').exists()).toBe(true);
	});

	it('shows the question, its four options and how many questions were seen', async () => {
		const {wrapper} = await mountQuestion('/p/frage/1', '1');
		expect(wrapper.find('.header').text()).toBe('Frage 1 · gesehen 1/310');
		expect(wrapper.find('.question-text').text()).toContain('offen etwas gegen die Regierung sagen');
		expect(wrapper.findAll('.option')).toHaveLength(4);
		expect(wrapper.find('.verdict').exists()).toBe(false);
		expect(wrapper.find('.next').exists()).toBe(false);
	});

	it('picks a question and moves to its address when none is given, keeping the weak mode', async () => {
		const {router, replace} = await mountQuestion('/p/frage?mode=weak', undefined);
		expect(replace).toHaveBeenCalledTimes(1);
		expect(router.currentRoute.value.name).toBe('question');
		expect(questionById.has(String(router.currentRoute.value.params.id))).toBe(true);
		expect(router.currentRoute.value.query).toEqual({mode: 'weak'});
		const plain = await mountQuestion('/p/frage', undefined);
		expect(plain.router.currentRoute.value.query).toEqual({});
	});

	it('goes home for a question that does not exist', async () => {
		const {replace} = await mountQuestion('/p/frage/999', '999');
		expect(replace).toHaveBeenCalledWith('/');
	});

	it('locks the options after a right answer, marks it green and offers the next question', async () => {
		const {wrapper, calls} = await mountQuestion('/p/frage/1', '1', {'POST /api/answers': {correct: true, correctIndex: key('1')}});
		await wrapper.findAll('.option')[key('1')].trigger('click');
		await flushPromises();
		expect(calls.at(-1)).toMatchObject({method: 'POST', body: {questionId: '1', chosen: key('1'), source: 'practice'}});
		expect(wrapper.find('.verdict').text()).toBe('Richtig!');
		expect(wrapper.find('.verdict').classes()).toContain('right');
		expect(wrapper.findAll('.option')[key('1')].classes()).toContain('right');
		expect(wrapper.findAll('.option').every((option) => option.attributes('disabled') !== undefined)).toBe(true);
		expect(wrapper.find('.header').text()).toContain('gesehen 2/310');
		expect(wrapper.find('.overview').exists()).toBe(true);
	});

	it('marks a wrong choice red, shows the right answer green and sends the weak source in weak mode', async () => {
		const wrongIndex = (key('1') + 1) % 4;
		const {wrapper, calls} = await mountQuestion('/p/frage/1?mode=weak', '1', {'POST /api/answers': {correct: false, correctIndex: key('1')}});
		await wrapper.findAll('.option')[wrongIndex].trigger('click');
		await flushPromises();
		expect(calls.at(-1)?.body.source).toBe('weak');
		expect(wrapper.find('.verdict').text()).toBe('Leider falsch');
		expect(wrapper.find('.verdict').classes()).toContain('wrong');
		expect(wrapper.findAll('.option')[wrongIndex].classes()).toContain('wrong');
		expect(wrapper.findAll('.option')[key('1')].classes()).toContain('right');
	});

	it('sends the original option index when the answers are shuffled', async () => {
		setShuffleAnswers(true);
		const {wrapper, calls} = await mountQuestion('/p/frage/1', '1', {'POST /api/answers': {correct: true, correctIndex: key('1')}});
		const right = questionById.get('1')!.options[key('1')];
		const shown = wrapper.findAll('.option');
		const position = shown.findIndex((option) => option.text() === right);
		await shown[position].trigger('click');
		await flushPromises();
		setShuffleAnswers(false);
		expect(calls.at(-1)).toMatchObject({method: 'POST', body: {questionId: '1', chosen: key('1')}});
		expect(wrapper.find('.verdict').text()).toBe('Richtig!');
		expect(wrapper.findAll('.option')[position].classes()).toContain('right');
	});

	it('keeps the easy mode for the next question and sends it as the source', async () => {
		const {wrapper, calls, router} = await mountQuestion('/p/frage/1?mode=easy', '1', {'POST /api/answers': {correct: true, correctIndex: key('1')}});
		await wrapper.findAll('.option')[key('1')].trigger('click');
		await flushPromises();
		expect(calls.at(-1)?.body.source).toBe('easy');
		await wrapper.find('.next').trigger('click');
		await flushPromises();
		expect(router.currentRoute.value.query).toEqual({mode: 'easy'});
	});

	it('answers only once', async () => {
		const {wrapper, calls} = await mountQuestion('/p/frage/1', '1', {'POST /api/answers': {correct: true, correctIndex: key('1')}});
		const options = wrapper.findAll('.option');
		await options[0].trigger('click');
		await options[1].trigger('click');
		await flushPromises();
		expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
	});

	it('unlocks the options and says so when the answer could not be saved', async () => {
		const {wrapper} = await mountQuestion('/p/frage/1', '1', {'POST /api/answers': fail(500)});
		await wrapper.findAll('.option')[0].trigger('click');
		await flushPromises();
		expect(wrapper.find('.err').text()).toContain('konnte nicht gespeichert werden');
		expect(wrapper.find('.verdict').exists()).toBe(false);
		expect(wrapper.findAll('.option')[0].attributes('disabled')).toBeUndefined();
	});

	it('moves on to the next picked question and starts fresh when the address changes', async () => {
		const {wrapper, router, progress} = await mountQuestion('/p/frage/1', '1', {'POST /api/answers': {correct: true, correctIndex: key('1')}});
		vi.spyOn(progress, 'next').mockReturnValue('7');
		await wrapper.findAll('.option')[0].trigger('click');
		await flushPromises();
		await wrapper.find('.next').trigger('click');
		await flushPromises();
		expect(router.currentRoute.value.params.id).toBe('7');
		await wrapper.setProps({id: '7'});
		expect(wrapper.find('.verdict').exists()).toBe(false);
		expect(wrapper.findAll('.option').every((option) => option.attributes('disabled') === undefined)).toBe(true);
		expect(wrapper.find('.question-text').text()).toBe(questionById.get('7')!.text);
	});

	it('shows the four pictures as options with their credit', async () => {
		const {wrapper} = await mountQuestion('/p/frage/21', '21');
		const pictures = wrapper.findAll('.option img');
		expect(pictures.map((image) => image.attributes('src'))).toEqual(['21-1.png', '21-2.png', '21-3.png', '21-4.png'].map((file) => `/images/${file}`));
		expect(wrapper.find('.options').classes()).toContain('pictures');
		expect(wrapper.find('.question-image').exists()).toBe(false);
	});

	it('shows a single picture above the question, with its credit', async () => {
		const {wrapper} = await mountQuestion('/p/frage/55', '55');
		expect(wrapper.find('.question-image').attributes('src')).toBe('/images/55-1.png');
		expect(wrapper.find('.credit').text()).toContain('Deutscher Bundestag');
		expect(wrapper.find('.option img').exists()).toBe(false);
	});

	it('shows four pictures without a credit line when the catalogue prints none', async () => {
		const {wrapper} = await mountQuestion('/p/frage/209', '209');
		expect(wrapper.findAll('.option img')).toHaveLength(4);
		expect(wrapper.find('.credit').exists()).toBe(false);
	});
});
