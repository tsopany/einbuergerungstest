import type { EntityManager } from "@mikro-orm/postgresql";
import { refreshCookie } from "@/auth/refresh-cookie";
import { issueRefreshToken } from "@/auth/tokens";
import { config } from "@/config";
import { signIn, type Profile } from "@/services/users";

export const loginRedirect = (error?: string): string => {
	const url = new URL("/p/login", config.FRONTEND_URL);
	if (error) url.searchParams.set("error", error);
	return url.toString();
};

export async function completeSignIn(em: EntityManager, profile: Profile) {
	const user = await signIn(em, profile);
	return { user, cookie: refreshCookie(await issueRefreshToken(em, user.id)) };
}
