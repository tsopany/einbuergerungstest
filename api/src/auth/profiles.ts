import type { Profile } from "@/services/users";

type Fetch = typeof fetch;

const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";

async function getJson<T>(fetcher: Fetch, url: string, accessToken: string): Promise<T | null> {
	try {
		const response = await fetcher(url, { headers: { Authorization: `Bearer ${accessToken}` } });
		return response.ok ? ((await response.json()) as T) : null;
	} catch {
		return null;
	}
}

export async function googleProfile(accessToken: string, fetcher: Fetch = fetch): Promise<Profile | null> {
	const user = await getJson<{ id?: string; email?: string; verified_email?: boolean }>(
		fetcher,
		GOOGLE_USERINFO,
		accessToken,
	);
	if (!user?.id || !user.email || user.verified_email !== true) return null;
	return { provider: "google", externalId: String(user.id), email: user.email };
}
