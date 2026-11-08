import {config, mount, RouterLinkStub} from '@vue/test-utils';
import {nextTick} from 'vue';

import {fail, signedIn, stubApi} from '../_helpers/api';
import i18n from '@/lib/i18n';
import {setShuffleAnswers} from '@/lib/order';
import {questionById} from '@/lib/questions';
import {useProgressStore} from '@/stores/progress';
import Exam from '@/views/Exam.vue';

config.global.plugins = [];

const IDS = ['1', '21', '55'];
const key = (id: string) => questionById.get(id)!.correct;
const wrong = (id: string) => (key(id) + 1) % 4;
const settle = () => vi.advanceTimersByTimeAsync(0);

const result = {score: 2, passed: false, wrong: [{questionId: '55', correctIndex: key('55')}]};
const baseRoutes = {'POST /api/exams/5/finish': result, 'GET /api/exams': []};

async function mountExam(routes: Record<string, unknown> = baseRoutes, ids = IDS) {
	const calls = stubApi(routes);
	const pinia = signedIn();
	const progress = useProgressStore();
	const start = vi.spyOn(progress, 'startExam').mockResolvedValue({id: 5, questionIds: ids});
	const wrapper = mount(Exam, {global: {plugins: [pinia, i18n], stubs: {RouterLink: RouterLinkStub}}});
	return {wrapper, calls, start};
}

async function running(routes?: Record<string, unknown>, ids?: string[]) {
	const mounted = await mountExam(routes, ids);
	await mounted.wrapper.find('.start').trigger('click');
	await settle();
	return mounted;
}

describe('Exam', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('explains the exam before it starts and says so when it cannot start', async () => {
		const {wrapper, start} = await mountExam();
		expect(wrapper.find('.intro').text()).toContain('33 Fragen');
		start.mockRejectedValueOnce(new Error('offline'));
		await wrapper.find('.start').trigger('click');
		await settle();
		expect(wrapper.find('.err').text()).toContain('konnte nicht gestartet werden');
		expect(wrapper.find('.timer').exists()).toBe(false);
		await wrapper.find('.start').trigger('click');
		await settle();
		expect(wrapper.find('.err').exists()).toBe(false);
		expect(wrapper.find('.timer').exists()).toBe(true);
	});

	it('keeps a shuffled order for a question across navigation and submits original indexes', async () => {
		setShuffleAnswers(true);
		const {wrapper, calls} = await running();
		const texts = () => wrapper.findAll('.option').map((option) => option.text());
		const before = texts();
		const right = questionById.get('1')!.options[key('1')];
		await wrapper.find('.forward').trigger('click');
		await wrapper.find('.previous').trigger('click');
		expect(texts()).toEqual(before);
		await wrapper.findAll('.option')[before.indexOf(right)].trigger('click');
		await wrapper.find('.submit').trigger('click');
		await wrapper.find('.confirm-yes').trigger('click');
		await settle();
		setShuffleAnswers(false);
		expect(calls.find((call) => call.path === '/api/exams/5/finish')?.body.answers).toContainEqual({questionId: '1', chosen: key('1')});
	});

	it('shows the first question with a full clock and counts down every second', async () => {
		const {wrapper} = await running();
		expect(wrapper.find('.progress').text()).toBe('Frage 1 von 3');
		expect(wrapper.find('.question-text').text()).toBe(questionById.get('1')!.text);
		expect(wrapper.find('.timer').text()).toContain('60:00');
		await vi.advanceTimersByTimeAsync(1000);
		expect(wrapper.find('.timer').text()).toContain('59:59');
		await vi.advanceTimersByTimeAsync(56 * 60 * 1000);
		expect(wrapper.find('.timer').text()).toContain('03:59');
		expect(wrapper.find('.timer').classes()).toContain('low');
	});

	it('lets her pick and change an answer, move back and forth and jump by number, without any verdict', async () => {
		const {wrapper} = await running();
		const options = () => wrapper.findAll('.option');
		await options()[2].trigger('click');
		expect(options()[2].classes()).toContain('selected');
		expect(wrapper.findAll('.number')[0].classes()).toContain('answered');
		await options()[1].trigger('click');
		expect(options()[1].classes()).toContain('selected');
		expect(options()[2].classes()).not.toContain('selected');
		expect(wrapper.find('.verdict').exists()).toBe(false);
		expect(wrapper.find('.previous').attributes('disabled')).toBeDefined();
		await wrapper.find('.forward').trigger('click');
		expect(wrapper.find('.progress').text()).toBe('Frage 2 von 3');
		expect(wrapper.findAll('.number')[1].classes()).toContain('current');
		await wrapper.findAll('.number')[2].trigger('click');
		expect(wrapper.find('.forward').attributes('disabled')).toBeDefined();
		await wrapper.find('.previous').trigger('click');
		expect(wrapper.find('.progress').text()).toBe('Frage 2 von 3');
		await wrapper.findAll('.number')[0].trigger('click');
		expect(options()[1].classes()).toContain('selected');
	});

	it('shows pictures as options and a single picture above the text, with its credit', async () => {
		const {wrapper} = await running();
		await wrapper.findAll('.number')[1].trigger('click');
		expect(wrapper.findAll('.option img')).toHaveLength(4);
		await wrapper.findAll('.number')[2].trigger('click');
		expect(wrapper.find('.question-image').attributes('src')).toBe('/images/55-1.png');
		expect(wrapper.find('.credit').text()).toContain('Deutscher Bundestag');
	});

	it('asks before handing in with open questions, and goes on when she says no', async () => {
		const {wrapper, calls} = await running();
		await wrapper.findAll('.option')[0].trigger('click');
		await wrapper.find('.submit').trigger('click');
		expect(wrapper.find('.confirm').text()).toContain('Es sind noch 2 Fragen offen');
		await wrapper.find('.confirm-no').trigger('click');
		expect(wrapper.find('.confirm').exists()).toBe(false);
		expect(calls.some((call) => call.method === 'POST')).toBe(false);
	});

	it('hands in after confirming and shows the result with her wrong or open answers', async () => {
		const {wrapper, calls} = await running();
		await wrapper.findAll('.option')[key('1')].trigger('click');
		await wrapper.findAll('.number')[1].trigger('click');
		await wrapper.findAll('.option')[key('21')].trigger('click');
		await wrapper.find('.submit').trigger('click');
		await wrapper.find('.confirm-yes').trigger('click');
		await settle();
		expect(calls.find((call) => call.path === '/api/exams/5/finish')?.body).toEqual({
			questionIds: IDS,
			answers: [
				{questionId: '1', chosen: key('1')},
				{questionId: '21', chosen: key('21')}
			]
		});
		expect(wrapper.find('.result').text()).toBe('NICHT BESTANDEN');
		expect(wrapper.find('.result').classes()).toContain('failed');
		expect(wrapper.find('.score').text()).toBe('2 von 33 richtig');
		const item = wrapper.find('.wrong-list li');
		expect(item.text()).toContain('Deine Antwort: keine Antwort');
		expect(item.text()).toContain(`Richtig: ${questionById.get('55')!.options[key('55')]}`);
		expect(wrapper.find('.timeup').exists()).toBe(false);
		expect(wrapper.find('.timer').exists()).toBe(false);
	});

	it('hands in at once when everything is answered, and shows a pass', async () => {
		const passed = {score: 33, passed: true, wrong: []};
		const {wrapper} = await running({...baseRoutes, 'POST /api/exams/5/finish': passed});
		for (const [index, id] of IDS.entries()) {
			await wrapper.findAll('.number')[index].trigger('click');
			await wrapper.findAll('.option')[key(id)].trigger('click');
		}
		await wrapper.find('.submit').trigger('click');
		await settle();
		expect(wrapper.find('.confirm').exists()).toBe(false);
		expect(wrapper.find('.result').text()).toBe('BESTANDEN');
		expect(wrapper.find('.result').classes()).toContain('passed');
		expect(wrapper.find('.wrong-list').exists()).toBe(false);
	});

	it('shows her chosen wrong answer next to the right one', async () => {
		const {wrapper} = await running({...baseRoutes, 'POST /api/exams/5/finish': {score: 2, passed: false, wrong: [{questionId: '1', correctIndex: key('1')}]}});
		await wrapper.findAll('.option')[wrong('1')].trigger('click');
		await wrapper.find('.submit').trigger('click');
		await wrapper.find('.confirm-yes').trigger('click');
		await settle();
		expect(wrapper.find('.wrong-list li').text()).toContain(`Deine Antwort: ${questionById.get('1')!.options[wrong('1')]}`);
	});

	it('stays in the exam and allows another try when handing in fails', async () => {
		const {wrapper, calls} = await running({...baseRoutes, 'POST /api/exams/5/finish': fail(500)});
		await wrapper.find('.submit').trigger('click');
		await wrapper.find('.confirm-yes').trigger('click');
		await settle();
		expect(wrapper.find('.err').text()).toContain('konnte nicht abgegeben werden');
		expect(wrapper.find('.timer').exists()).toBe(true);
		expect(wrapper.find('.submit').attributes('disabled')).toBeUndefined();
		await wrapper.find('.submit').trigger('click');
		await wrapper.find('.confirm-yes').trigger('click');
		await settle();
		expect(calls.filter((call) => call.path === '/api/exams/5/finish')).toHaveLength(2);
	});

	it('hands in by itself when the time is up and says so', async () => {
		const {wrapper, calls} = await running();
		await wrapper.findAll('.option')[0].trigger('click');
		await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
		expect(calls.filter((call) => call.path === '/api/exams/5/finish')).toHaveLength(1);
		expect(wrapper.find('.timeup').text()).toContain('Die Zeit ist abgelaufen');
		expect(wrapper.find('.result').exists()).toBe(true);
	});

	it('hands in only once however often it is asked while the first is on its way', async () => {
		let release: () => void = () => undefined;
		const slow = new Promise<void>((resolve) => {
			release = resolve;
		});
		const {wrapper, calls} = await running({...baseRoutes, 'POST /api/exams/5/finish': () => slow.then(() => result)});
		await wrapper.find('.submit').trigger('click');
		const yes = wrapper.find('.confirm-yes');
		await yes.trigger('click');
		await nextTick();
		expect(wrapper.find('.submit').attributes('disabled')).toBeDefined();
		await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
		release();
		await settle();
		expect(calls.filter((call) => call.path === '/api/exams/5/finish')).toHaveLength(1);
	});

	it('stops the clock when she leaves', async () => {
		const {wrapper} = await running();
		const clear = vi.spyOn(globalThis, 'clearInterval');
		wrapper.unmount();
		expect(clear).toHaveBeenCalled();
	});
});
