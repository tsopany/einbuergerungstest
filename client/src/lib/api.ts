import {demoApi, isDemo} from '@/lib/demo';
import i18n from '@/lib/i18n';

const API_BASE_URL = (): string => import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, message: string, code = 'error') {
		super(message);
		this.status = status;
		this.code = code;
	}
}

export const apiUrl = (path: string): string => `${API_BASE_URL()}${path}`;

type Options = {method?: string; body?: unknown; token?: string | null};

const headersFor = ({body, token}: Options): Record<string, string> => ({
	'x-requested-with': 'einbuergerungstest',
	...(body === undefined ? {} : {'content-type': 'application/json'}),
	...(token ? {authorization: `Bearer ${token}`} : {})
});

export async function api<T>(path: string, options: Options = {}): Promise<T> {
	if (isDemo()) return demoApi<T>(path, options);
	const response = await fetch(apiUrl(path), {
		method: options.method ?? 'GET',
		credentials: 'include',
		headers: headersFor(options),
		body: options.body === undefined ? undefined : JSON.stringify(options.body)
	});
	const payload = await response.json().catch(() => ({}));
	if (!response.ok)
		throw new ApiError(
			response.status,
			typeof payload.message === 'string' ? payload.message : response.statusText,
			typeof payload.code === 'string' ? payload.code : undefined
		);
	return payload as T;
}

export function errorText(failure: unknown): string {
	if (!(failure instanceof ApiError)) return i18n.global.t('app.requestFailed');
	const key = `errors.${failure.code}`;
	return i18n.global.te(key) ? i18n.global.t(key) : failure.message;
}
