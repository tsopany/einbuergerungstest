import {questionById} from '@/lib/questions';

/** An exam in progress, kept in the browser so a refresh or a closed tab continues where it was; the clock keeps running meanwhile. */
export type Run = {
	examId: number;
	questionIds: string[];
	chosen: [string, number][];
	orders: [string, number[]][];
	current: number;
	deadline: number;
};

const keyOf = (user: string): string => `exam-run:${user}`;

export function saveRun(user: string, run: Run): void {
	try {
		localStorage.setItem(keyOf(user), JSON.stringify(run));
	} catch {
		// storage blocked: the exam still works, it just cannot survive a refresh
	}
}

export function clearRun(user: string): void {
	try {
		localStorage.removeItem(keyOf(user));
	} catch {
		// nothing stored, nothing to clear
	}
}

const hasShape = (run: Run | null): run is Run =>
	run !== null &&
	Number.isInteger(run.examId) &&
	Number.isInteger(run.current) &&
	typeof run.deadline === 'number' &&
	Array.isArray(run.chosen) &&
	Array.isArray(run.orders) &&
	Array.isArray(run.questionIds);

const isRun = (run: Run | null): run is Run => hasShape(run) && run.current >= 0 && run.current < run.questionIds.length && run.questionIds.every((id) => questionById.has(id));

export function loadRun(user: string): Run | null {
	try {
		const run = JSON.parse(localStorage.getItem(keyOf(user)) ?? 'null') as Run | null;
		return isRun(run) ? run : null;
	} catch {
		return null;
	}
}
