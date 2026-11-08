import {demoApi, isDemo} from '@/lib/demo';
import {questionById} from '@/lib/questions';

const key = (id: string) => questionById.get(id)!.correct;
const IDS = ['1', ...Array.from({length: 29}, (_, index) => String(index + 2)), 'NW-1', 'NW-2', 'NW-3'];

describe('demo api', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('is on only when VITE_DEMO is true', () => {
		expect(isDemo()).toBe(false);
		vi.stubEnv('VITE_DEMO', 'true');
		expect(isDemo()).toBe(true);
	});

	it('signs in a demo user without any server', async () => {
		expect(await demoApi('/api/auth/refresh', {method: 'POST'})).toEqual({accessToken: 'demo'});
		expect(await demoApi('/api/me', {})).toMatchObject({id: 'demo', name: 'Demo'});
		expect(await demoApi('/api/auth/logout', {method: 'POST'})).toEqual({success: true});
		expect(await demoApi('/api/me', {method: 'DELETE'})).toEqual({success: true});
	});

	it('records practice answers and judges them from the catalogue', async () => {
		expect(await demoApi('/api/answers', {method: 'POST', body: {questionId: '1', chosen: key('1'), source: 'practice'}})).toEqual({correct: true, correctIndex: key('1')});
		expect(await demoApi('/api/answers', {method: 'POST', body: {questionId: '1', chosen: (key('1') + 1) % 4, source: 'weak'}})).toMatchObject({correct: false});
		expect(await demoApi<unknown[]>('/api/answers', {})).toHaveLength(2);
		expect(await demoApi<{seed: number}>('/api/seed', {})).toEqual({seed: expect.any(Number)});
	});

	it('runs an exam: scores it, lists it and keeps the answers', async () => {
		const {id} = await demoApi<{id: number}>('/api/exams', {method: 'POST'});
		const answers = IDS.slice(0, 20).map((questionId) => ({questionId, chosen: key(questionId)}));
		const result = await demoApi<{score: number; passed: boolean; wrong: unknown[]}>(`/api/exams/${id}/finish`, {method: 'POST', body: {questionIds: IDS, answers}});
		expect(result).toMatchObject({score: 20, passed: true});
		expect(result.wrong).toHaveLength(13);
		expect(await demoApi<unknown[]>('/api/exams', {})).toMatchObject([{id, score: 20, passed: true}]);
		const report = await demoApi<{questions: {questionId: string; chosen: number | null}[]}>(`/api/exams/${id}`, {});
		expect(report).toMatchObject({id, score: 20});
		expect(report.questions).toHaveLength(33);
		expect(report.questions.at(-1)?.chosen).toBeNull();
		expect(await demoApi<unknown[]>('/api/answers', {})).toHaveLength(22);
	});

	it('forgets everything on reset and refuses what the demo does not offer', async () => {
		expect(await demoApi('/api/progress', {method: 'DELETE'})).toEqual({success: true});
		expect(await demoApi<unknown[]>('/api/answers', {})).toEqual([]);
		expect(await demoApi<unknown[]>('/api/exams', {})).toEqual([]);
		await expect(demoApi('/api/nope', {})).rejects.toMatchObject({status: 404});
		await expect(demoApi('/api/exams/999', {})).rejects.toMatchObject({status: 404, code: 'exam_not_found'});
	});
});
