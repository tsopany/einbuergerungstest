import {api, ApiError, apiUrl, errorText} from '@/lib/api';
import i18n from '@/lib/i18n';

const respond = (status: number, body: unknown) =>
	vi.fn(async (_url: string, _init?: RequestInit) => ({ok: status < 400, status, statusText: 'Status text', json: async () => body}));

describe('api', () => {
	it('builds urls from the api origin and strips a trailing slash', () => {
		expect(apiUrl('/api/health')).toBe('http://localhost:8115/api/health');
		vi.stubEnv('VITE_API_BASE_URL', 'https://test.tsopany.com/');
		expect(apiUrl('/api/health')).toBe('https://test.tsopany.com/api/health');
		vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8115');
	});

	it('sends credentials, the request header and the bearer token', async () => {
		const fetchMock = respond(200, {status: 'ok'});
		vi.stubGlobal('fetch', fetchMock);
		expect(await api('/api/health', {token: 'tok'})).toEqual({status: 'ok'});
		expect(fetchMock).toHaveBeenCalledWith('http://localhost:8115/api/health', {
			method: 'GET',
			credentials: 'include',
			headers: {'x-requested-with': 'einbuergerungstest', authorization: 'Bearer tok'},
			body: undefined
		});
	});

	it('sends a json body', async () => {
		const fetchMock = respond(200, {});
		vi.stubGlobal('fetch', fetchMock);
		await api('/api/answers', {method: 'POST', body: {chosen: 1}});
		expect(fetchMock.mock.calls[0][1]).toMatchObject({method: 'POST', headers: {'content-type': 'application/json'}, body: '{"chosen":1}'});
	});

	it('throws ApiError with the server message and code', async () => {
		vi.stubGlobal('fetch', respond(409, {message: 'Conflict', code: 'conflict'}));
		await expect(api('/x')).rejects.toMatchObject({status: 409, message: 'Conflict', code: 'conflict'});
		await expect(api('/x')).rejects.toBeInstanceOf(ApiError);
	});

	it('falls back to the status text and a generic code', async () => {
		vi.stubGlobal('fetch', respond(500, {}));
		await expect(api('/x')).rejects.toMatchObject({status: 500, message: 'Status text', code: 'error'});
	});

	it('words an error for the user in German', () => {
		expect(errorText(new Error('boom'))).toBe('Anfrage fehlgeschlagen');
		expect(errorText(new ApiError(400, 'Server text', 'unknown_code'))).toBe('Server text');
		i18n.global.mergeLocaleMessage('de', {errors: {known_code: 'Bekannter Fehler'}});
		expect(errorText(new ApiError(400, 'Server text', 'known_code'))).toBe('Bekannter Fehler');
	});
});
