import {defineStore} from 'pinia';
import {computed, ref} from 'vue';

import {questionById} from '@/lib/questions';
import {random} from '@/lib/random';
import {useAuthStore} from '@/stores/auth';
import {buildExam} from '#shared/exam';
import {QUESTION_IDS} from '#shared/ids';
import {pickNext, type Mode} from '#shared/picker';
import {mulberry32} from '#shared/rng';
import {deriveStates, type Answer} from '#shared/state';
import {accuracy, readiness, summarize, weakest} from '#shared/stats';

export interface ExamRow {
	id: number;
	startedAt: number;
	finishedAt: number;
	score: number;
	passed: boolean;
}

export interface ExamResult {
	score: number;
	passed: boolean;
	wrong: {questionId: string; correctIndex: number}[];
}

interface ServerAnswer extends Answer {
	chosen: number;
	source: string;
	examId: number | null;
}

export const useProgressStore = defineStore('progress', () => {
	const auth = useAuthStore();
	const answers = ref<Answer[]>([]);
	const seed = ref(0);
	const exams = ref<ExamRow[]>([]);
	const loaded = ref(false);
	let loading: Promise<void> | null = null;

	function load(): Promise<void> {
		if (loaded.value) return Promise.resolve();
		loading ??= Promise.all([auth.request<ServerAnswer[]>('/api/answers'), auth.request<{seed: number}>('/api/seed'), auth.request<ExamRow[]>('/api/exams')])
			.then(([storedAnswers, storedSeed, storedExams]) => {
				answers.value = storedAnswers.map(({questionId, correct, answeredAt}) => ({questionId, correct, answeredAt}));
				seed.value = storedSeed.seed;
				exams.value = storedExams;
				loaded.value = true;
			})
			.finally(() => {
				loading = null;
			});
		return loading;
	}

	const states = computed(() => deriveStates(answers.value));
	const summary = computed(() => summarize(QUESTION_IDS, states.value));
	const weakestIds = computed(() => weakest(QUESTION_IDS, states.value));
	const rates = () => accuracy(answers.value, Date.now());
	const readinessNow = () => readiness(QUESTION_IDS, answers.value, mulberry32(Math.floor(random() * 2 ** 32)));

	const next = (mode: Mode): string => pickNext({ids: QUESTION_IDS, answers: answers.value, seed: seed.value, now: Date.now(), rng: random, mode});

	async function record(questionId: string, chosen: number, mode: Mode) {
		const result = await auth.request<{correct: boolean; correctIndex: number}>('/api/answers', {method: 'POST', body: {questionId, chosen, source: mode}});
		answers.value.push({questionId, correct: result.correct, answeredAt: Date.now()});
		return result;
	}

	async function startExam() {
		const {id} = await auth.request<{id: number}>('/api/exams', {method: 'POST'});
		return {id, questionIds: buildExam(QUESTION_IDS, random)};
	}

	async function finishExam(id: number, questionIds: string[], chosen: ReadonlyMap<string, number>): Promise<ExamResult> {
		const submitted = [...chosen].map(([questionId, choice]) => ({questionId, chosen: choice}));
		const result = await auth.request<ExamResult>(`/api/exams/${id}/finish`, {method: 'POST', body: {questionIds, answers: submitted}});
		const now = Date.now();
		for (const {questionId, chosen: choice} of submitted) answers.value.push({questionId, correct: questionById.get(questionId)?.correct === choice, answeredAt: now});
		exams.value = await auth.request<ExamRow[]>('/api/exams');
		return result;
	}

	async function reset(): Promise<void> {
		await auth.request('/api/progress', {method: 'DELETE'});
		answers.value = [];
		exams.value = [];
		seed.value = (await auth.request<{seed: number}>('/api/seed')).seed;
	}

	return {answers, seed, exams, loaded, load, states, summary, weakestIds, rates, readinessNow, next, record, startExam, finishExam, reset};
});
