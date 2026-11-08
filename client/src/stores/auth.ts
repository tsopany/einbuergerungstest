import {defineStore} from 'pinia';
import {ref} from 'vue';

import {api, ApiError} from '@/lib/api';

export interface Me {
	id: string;
	email: string;
	name?: string | null;
}

export const useAuthStore = defineStore('auth', () => {
	const token = ref<string | null>(null);
	const user = ref<Me | null>(null);
	let inflight: Promise<boolean> | null = null;

	const exchange = (): Promise<boolean> =>
		api<{accessToken: string}>('/api/auth/refresh', {method: 'POST'})
			.then((response) => {
				token.value = response.accessToken;
				return true;
			})
			.catch(() => {
				token.value = null;
				return false;
			});

	function refresh(): Promise<boolean> {
		inflight ??= (globalThis.navigator?.locks ? globalThis.navigator.locks.request('einbuergerungstest-refresh', exchange) : exchange()).finally(() => {
			inflight = null;
		});
		return inflight;
	}

	async function withToken<T>(call: (_token: string | null) => Promise<T>): Promise<T> {
		if (!token.value && !(await refresh())) throw new ApiError(401, 'Not signed in');
		try {
			return await call(token.value);
		} catch (error) {
			if (!(error instanceof ApiError) || error.status !== 401 || !(await refresh())) throw error;
			return call(token.value);
		}
	}

	const request = <T>(path: string, options: {method?: string; body?: unknown} = {}): Promise<T> => withToken((current) => api<T>(path, {...options, token: current}));

	async function signIn(): Promise<Me | null> {
		if (!(await refresh())) return null;
		user.value = await request<Me>('/api/me');
		return user.value;
	}

	async function signOut(): Promise<void> {
		await api('/api/auth/logout', {method: 'POST'}).catch(() => undefined);
		token.value = null;
		user.value = null;
	}

	async function deleteAccount(): Promise<void> {
		await request('/api/me', {method: 'DELETE'});
		token.value = null;
		user.value = null;
	}

	return {token, user, refresh, request, signIn, signOut, deleteAccount};
});
