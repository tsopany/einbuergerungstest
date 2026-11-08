import {createPinia, setActivePinia} from 'pinia';

import {ApiError} from '@/lib/api';
import {useAuthStore} from '@/stores/auth';

const ok = (body: unknown) => ({ok: true, status: 200, statusText: 'OK', json: async () => body});
const fail = (status: number) => ({ok: false, status, statusText: 'No', json: async () => ({message: 'No', code: 'no'})});

describe('auth store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.stubGlobal('navigator', {});
	});

	it('refreshes the token and loads the profile on sign-in', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(ok({accessToken: 'tok'}))
			.mockResolvedValueOnce(ok({id: 'u1', email: 'me@example.com'}));
		vi.stubGlobal('fetch', fetchMock);
		const auth = useAuthStore();
		expect(await auth.signIn()).toEqual({id: 'u1', email: 'me@example.com'});
		expect(auth.token).toBe('tok');
		expect(fetchMock.mock.calls[1][1].headers.authorization).toBe('Bearer tok');
	});

	it('answers null when there is no session', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(401)));
		const auth = useAuthStore();
		expect(await auth.signIn()).toBeNull();
		expect(auth.token).toBeNull();
		await expect(auth.request('/api/me')).rejects.toBeInstanceOf(ApiError);
	});

	it('shares one refresh between callers, using the browser lock when there is one', async () => {
		const locks = {request: vi.fn(async (_name: string, callback: () => Promise<boolean>) => callback())};
		vi.stubGlobal('navigator', {locks});
		const fetchMock = vi.fn().mockResolvedValue(ok({accessToken: 'tok'}));
		vi.stubGlobal('fetch', fetchMock);
		const auth = useAuthStore();
		expect(await Promise.all([auth.refresh(), auth.refresh()])).toEqual([true, true]);
		expect(locks.request).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('refreshes once and retries a request that was refused', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(ok({accessToken: 'old'}))
			.mockResolvedValueOnce(fail(401))
			.mockResolvedValueOnce(ok({accessToken: 'new'}))
			.mockResolvedValueOnce(ok({done: true}));
		vi.stubGlobal('fetch', fetchMock);
		const auth = useAuthStore();
		expect(await auth.request('/api/thing')).toEqual({done: true});
		expect(auth.token).toBe('new');
	});

	it('gives up when the retry cannot refresh, and passes other errors on', async () => {
		const auth = useAuthStore();
		auth.token = 'tok';
		vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(fail(401)).mockResolvedValueOnce(fail(401)));
		await expect(auth.request('/api/thing')).rejects.toMatchObject({status: 401});
		auth.token = 'tok';
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(500)));
		await expect(auth.request('/api/thing')).rejects.toMatchObject({status: 500});
	});

	it('signs out locally even when the server call fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		const auth = useAuthStore();
		auth.token = 'tok';
		auth.user = {id: 'u1', email: 'me@example.com'};
		await auth.signOut();
		expect(auth.token).toBeNull();
		expect(auth.user).toBeNull();
	});

	it('deletes the account and signs out locally', async () => {
		const fetchMock = vi.fn().mockResolvedValue(ok({success: true}));
		vi.stubGlobal('fetch', fetchMock);
		const auth = useAuthStore();
		auth.token = 'tok';
		auth.user = {id: 'u1', email: 'me@example.com'};
		await auth.deleteAccount();
		expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
		expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8115/api/me');
		expect(auth.token).toBeNull();
		expect(auth.user).toBeNull();
	});

	it('keeps the session when the deletion fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(500)));
		const auth = useAuthStore();
		auth.token = 'tok';
		auth.user = {id: 'u1', email: 'me@example.com'};
		await expect(auth.deleteAccount()).rejects.toMatchObject({status: 500});
		expect(auth.user).not.toBeNull();
	});
});
