import {ApiError} from '@/lib/api';
import {questionById} from '@/lib/questions';
import {random} from '@/lib/random';
import {scoreExam} from '#shared/exam';

export const isDemo = (): boolean => import.meta.env.VITE_DEMO === 'true';

type Stored = {questionId: string; chosen: number; correct: boolean; answeredAt: number; source: string; examId: number | null};
type Finished = {id: number; startedAt: number; finishedAt: number; score: number; passed: boolean};
type Body = {questionId: string; chosen: number; source: string; questionIds: string[]; answers: {questionId: string; chosen: number}[]};

const demoUser = {id: 'demo', email: 'demo@example.com', name: 'Demo'};
const notFound = (): never => {
	throw new ApiError(404, 'Exam not found', 'exam_not_found');
};
const newSeed = (): number => Math.floor(random() * 2 ** 31);

// Lives only in this tab: a reload starts over, nothing is sent anywhere.
let answers: Stored[] = [];
let exams: Finished[] = [];
const started = new Map<number, number>();
let seed = newSeed();
let nextExam = 1;
let reports = new Map<number, unknown>();

const answerOf = (questionId: string, chosen: number, source: string, examId: number | null, answeredAt = Date.now()): {correct: boolean; correctIndex: number} => {
	const correctIndex = questionById.get(questionId)?.correct ?? -1;
	answers.push({questionId, chosen, correct: chosen === correctIndex, answeredAt, source, examId});
	return {correct: chosen === correctIndex, correctIndex};
};

function finish(id: number, body: Body): {score: number; passed: boolean; wrong: {questionId: string; correctIndex: number}[]} {
	const now = Date.now();
	const startedAt = started.get(id) ?? now;
	started.delete(id);
	const result = scoreExam(
		body.questionIds.map((questionId) => questionById.get(questionId)!),
		new Map(body.answers.map((given) => [given.questionId, given.chosen]))
	);
	for (const given of body.answers) answerOf(given.questionId, given.chosen, 'exam', id, now);
	exams = [{id, startedAt, finishedAt: now, score: result.score, passed: result.passed}, ...exams];
	const chosen = new Map(body.answers.map((given) => [given.questionId, given.chosen]));
	reports.set(id, {
		id,
		startedAt,
		finishedAt: now,
		score: result.score,
		passed: result.passed,
		questions: body.questionIds.map((questionId) => ({questionId, chosen: chosen.get(questionId) ?? null, correctIndex: questionById.get(questionId)!.correct}))
	});
	return {...result, wrong: result.wrong.map((questionId) => ({questionId, correctIndex: questionById.get(questionId)!.correct}))};
}

/** The api answered from memory, so the app can be tried without a server or a database. */
export async function demoApi<T>(path: string, {method = 'GET', body}: {method?: string; body?: unknown}): Promise<T> {
	const given = body as Body;
	const route = `${method} ${path.replace(/\/\d+(\/|$)/, '/:id$1')}`;
	const reply: Record<string, () => unknown> = {
		'POST /api/auth/refresh': () => ({accessToken: 'demo'}),
		'POST /api/auth/logout': () => ({success: true}),
		'GET /api/me': () => demoUser,
		'DELETE /api/me': () => ({success: true}),
		'GET /api/answers': () => answers,
		'POST /api/answers': () => answerOf(given.questionId, given.chosen, given.source, null),
		'GET /api/seed': () => ({seed}),
		'GET /api/exams': () => exams,
		'GET /api/exams/:id': () => reports.get(Number(path.split('/').at(-1))) ?? notFound(),
		'POST /api/exams': () => {
			const id = nextExam++;
			started.set(id, Date.now());
			return {id, startedAt: Date.now()};
		},
		'POST /api/exams/:id/finish': () => finish(Number(/\/(\d+)\//.exec(path)![1]), given),
		'DELETE /api/progress': () => {
			answers = [];
			exams = [];
			reports = new Map();
			seed = newSeed();
			return {success: true};
		}
	};
	if (!(route in reply)) throw new ApiError(404, 'Not available in the demo', 'not_found');
	return reply[route]() as T;
}
