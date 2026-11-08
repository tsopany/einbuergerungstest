import oauth2, { type OAuth2Namespace } from "@fastify/oauth2";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "@/config";
import { googleProfile } from "@/auth/profiles";
import { completeSignIn, loginRedirect } from "@/auth/signIn";
import { clearedRefreshCookie, hasRefreshHeader, readRefreshCookie, refreshCookie } from "@/auth/refresh-cookie";
import { consumeRefreshToken, issueRefreshToken, revokeFamily } from "@/auth/tokens";
import { getEm } from "@/db/orm";
import { errorBody } from "@/errors";
import { findUser, type Profile } from "@/services/users";

const ACCESS_TTL = "15m";

declare module "fastify" {
	interface FastifyInstance {
		googleOAuth2?: OAuth2Namespace;
	}
}

export type AuthOptions = { exchange?: (namespace: OAuth2Namespace, request: FastifyRequest) => Promise<string> };

const defaultExchange: NonNullable<AuthOptions["exchange"]> = async (namespace, request) =>
	(await namespace.getAccessTokenFromAuthorizationCodeFlow(request)).token.access_token;

type Provider = {
	name: "google";
	clientId?: string;
	clientSecret?: string;
	callbackUrl?: string;
	scope: string[];
	configuration: typeof oauth2.GOOGLE_CONFIGURATION;
	profile: (accessToken: string) => Promise<Profile | null>;
};

const providers: Provider[] = [
	{
		name: "google",
		clientId: config.GOOGLE_CLIENT_ID,
		clientSecret: config.GOOGLE_CLIENT_SECRET,
		callbackUrl: config.GOOGLE_CALLBACK_URL,
		scope: ["openid", "profile", "email"],
		configuration: oauth2.GOOGLE_CONFIGURATION,
		profile: (token) => googleProfile(token),
	},
];

export default async function authRoutes(app: FastifyInstance, options: AuthOptions) {
	const exchange = options.exchange ?? defaultExchange;
	const unauthorized = (reply: FastifyReply, message: string) =>
		reply
			.header("set-cookie", clearedRefreshCookie())
			.status(401)
			.send(errorBody(401, "invalid_refresh_token", message));

	for (const provider of providers) {
		if (!provider.clientId || !provider.clientSecret || !provider.callbackUrl) continue;
		await app.register(oauth2, {
			name: `${provider.name}OAuth2`,
			scope: provider.scope,
			credentials: {
				client: { id: provider.clientId, secret: provider.clientSecret },
				auth: provider.configuration,
			},
			startRedirectPath: `/auth/${provider.name}`,
			callbackUri: provider.callbackUrl,
			redirectStateCookieName: `oauth2-state-${provider.name}`,
			verifierCookieName: `oauth2-verifier-${provider.name}`,
		});

		app.get(`/auth/${provider.name}/callback`, async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const accessToken = await exchange(app[`${provider.name}OAuth2`]!, request);
				const profile = await provider.profile(accessToken);
				if (!profile) return reply.redirect(loginRedirect("unverified_email"));
				const { cookie } = await completeSignIn(getEm(), profile);
				return reply.header("set-cookie", cookie).redirect(loginRedirect());
			} catch (error) {
				request.log.error(error, "oauth sign-in failed");
				return reply.redirect(loginRedirect("oauth_failed"));
			}
		});
	}

	app.post("/auth/refresh", async (request, reply) => {
		if (!hasRefreshHeader(request, reply)) return;
		const presented = readRefreshCookie(request.headers.cookie);
		if (!presented) return unauthorized(reply, "Invalid refresh token");
		const rotated = await getEm().transactional(async (em) => {
			const consumed = await consumeRefreshToken(em, presented);
			const user = consumed ? await findUser(em, consumed.userId) : null;
			if (!consumed || !user) return null;
			return { user, next: await issueRefreshToken(em, user.id, undefined, consumed.familyId) };
		});
		if (!rotated) return unauthorized(reply, "Invalid refresh token");
		return reply
			.header("set-cookie", refreshCookie(rotated.next))
			.send({ accessToken: app.jwt.sign({ id: rotated.user.id }, { expiresIn: ACCESS_TTL }) });
	});

	app.post("/auth/logout", async (request, reply) => {
		if (!hasRefreshHeader(request, reply)) return;
		const presented = readRefreshCookie(request.headers.cookie);
		if (presented) await revokeFamily(getEm(), presented);
		return reply.header("set-cookie", clearedRefreshCookie()).send({ success: true });
	});
}
