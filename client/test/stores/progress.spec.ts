import {setActivePinia} from 'pinia';

import {fail, serverAnswer, signedIn, stubApi} from '../_helpers/api';
import {useProgressStore} from '@/stores/progress';
import {EXAM, idNumber, QUESTION_IDS} from '#shared/ids';

const routes = () => ({
	'GET /api/answers': [serverAnswer('1', true), serverAnswer('2', false)],
	'GET /api/seed': {seed: 42},
	'GET /api/exams': [{id: 7, startedAt: 1, finishedAt: 2, score: 20, passed: true}]
});

function store() {
	setActivePinia(signedIn());
	return useProgressStore();
}

describe('progress store', () => {
	it('loads answers, seed and exams once, and shares a load in flight', async () => {
		const calls = stubApi(routes());
		const progress = store();
		await Promise.all([progress.load(), progress.load()]);
		await progress.load();
		expect(calls.map((call) => call.path).sort((a, b) => a.localeCompare(b))).toEqual(['/api/answers', '/api/exams', '/api/seed']);
		expect(progress.loaded).toBe(true);
		expect(progress.seed).toBe(42);
		expect(progress.answers.map((answer) => [answer.questionId, answer.correct])).toEqual([
			['1', true],
			['2', false]
		]);
		expect(progress.exams).toHaveLength(1);
	});

	it('lets a failed load be tried again', async () => {
		stubApi({...routes(), 'GET /api/seed': fail(500)});
		const progress = store();
		await expect(progress.load()).rejects.toMatchObject({status: 500});
		expect(progress.loaded).toBe(false);
		const calls = stubApi(routes());
		await progress.load();
		expect(calls).toHaveLength(3);
		expect(progress.loaded).toBe(true);
	});

	it('derives the summary, the weakest questions and the rates from the answers', async () => {
		stubApi(routes());
		const progress = store();
		await progress.load();
		expect(progress.summary).toMatchObject({seen: 2, mastered: 0, unseen: 308, phase: 'coverage'});
		expect(progress.weakestIds).toEqual(['2', '1']);
		expect(progress.rates().overall).toEqual({correct: 1, total: 2, rate: 0.5});
		const chance = progress.readinessNow();
		expect(chance.probability).toBeGreaterThanOrEqual(0);
		expect(chance.probability).toBeLessThanOrEqual(1);
	});

	it('picks the next question: an unseen one first', async () => {
		stubApi(routes());
		const progress = store();
		await progress.load();
		const picked = progress.next('practice');
		expect(QUESTION_IDS).toContain(picked);
		expect(['1', '2']).not.toContain(picked);
		expect(QUESTION_IDS).toContain(progress.next('weak'));
	});

	it('sends an answer, takes the verdict from the server and remembers it', async () => {
		const calls = stubApi({...routes(), 'POST /api/answers': {correct: true, correctIndex: 3}});
		const progress = store();
		await progress.load();
		expect(await progress.record('5', 3, 'weak')).toEqual({correct: true, correctIndex: 3});
		expect(calls.at(-1)).toMatchObject({method: 'POST', body: {questionId: '5', chosen: 3, source: 'weak'}});
		expect(progress.answers.at(-1)).toMatchObject({questionId: '5', correct: true});
	});

	it('starts an exam with 30 general and 3 state questions', async () => {
		stubApi({'POST /api/exams': {id: 9, startedAt: 1}});
		const exam = await store().startExam();
		expect(exam.id).toBe(9);
		expect(exam.questionIds).toHaveLength(EXAM.total);
		expect(exam.questionIds.filter((id) => idNumber(id)?.part === 'state')).toHaveLength(EXAM.state);
	});

	it('submits an exam, keeps the answers locally and refreshes the history', async () => {
		const result = {score: 1, passed: false, wrong: []};
		const calls = stubApi({...routes(), 'POST /api/exams/9/finish': result});
		const progress = store();
		await progress.load();
		const ids = QUESTION_IDS.slice(0, 33);
		const outcome = await progress.finishExam(9, ids, new Map([['1', 3]]));
		expect(outcome).toEqual(result);
		const post = calls.find((call) => call.method === 'POST')!;
		expect(post.body).toEqual({questionIds: ids, answers: [{questionId: '1', chosen: 3}]});
		expect(progress.answers.at(-1)).toMatchObject({questionId: '1', correct: true});
		expect(calls.filter((call) => call.path === '/api/exams' && call.method === 'GET')).toHaveLength(2);
	});

	it('records a wrong exam answer as wrong', async () => {
		stubApi({...routes(), 'POST /api/exams/9/finish': {score: 0, passed: false, wrong: []}});
		const progress = store();
		await progress.load();
		await progress.finishExam(9, QUESTION_IDS.slice(0, 33), new Map([['1', 0]]));
		expect(progress.answers.at(-1)).toMatchObject({questionId: '1', correct: false});
	});

	it('resets the progress and fetches a fresh seed', async () => {
		let seed = 42;
		const calls = stubApi({...routes(), 'DELETE /api/progress': {success: true}, 'GET /api/seed': () => ({seed: seed++})});
		const progress = store();
		await progress.load();
		await progress.reset();
		expect(calls.some((call) => call.method === 'DELETE' && call.path === '/api/progress')).toBe(true);
		expect(progress.answers).toEqual([]);
		expect(progress.exams).toEqual([]);
		expect(progress.seed).toBe(43);
	});
});
