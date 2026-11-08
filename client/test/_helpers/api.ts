import {createPinia, setActivePinia} from 'pinia';

import {useAuthStore} from '@/stores/auth';

const FAIL = Symbol('fail');

export const fail = (status: number, body: unknown = {message: 'No', code: 'no'}) => ({[FAIL]: true, status, body});

export interface Call {
	method: string;
	path: string;
	body: any;
}

/** Answers fetch from a table of "METHOD /path" entries (a value, a function of the body, or fail(status)). */
export function stubApi(routes: Record<string, unknown>) {
	const calls: Call[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			const path = new URL(url).pathname;
			const method = init?.method ?? 'GET';
			const body = init?.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({method, path, body});
			const entry = routes[`${method} ${path}`];
			const value = entry instanceof Function ? entry.call(null, body) : entry;
			if (value && typeof value === 'object' && FAIL in value) {
				const failure = value as ReturnType<typeof fail>;
				return {ok: false, status: failure.status, statusText: 'No', json: async () => failure.body};
			}
			return {ok: true, status: 200, statusText: 'OK', json: async () => value ?? {}};
		})
	);
	return calls;
}

/** A fresh pinia with a signed-in user and a token, so requests go straight out. */
export function signedIn() {
	const pinia = createPinia();
	setActivePinia(pinia);
	const auth = useAuthStore();
	auth.token = 'tok';
	auth.user = {id: 'u1', email: 'me@example.com'};
	return pinia;
}

export const serverAnswer = (questionId: string, correct: boolean, answeredAt = Date.now() - 1000) => ({
	questionId,
	chosen: 0,
	correct,
	answeredAt,
	source: 'practice',
	examId: null
});
