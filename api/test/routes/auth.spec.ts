import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as tokens from "@/auth/tokens";
import { cookieOf, startApp, stopApp, stubProvider } from "../_helpers/server";
import { resetDatabase } from "#testdb";

const header = { "x-requested-with": "einbuergerungstest" };
const GOOGLE_USER = "https://www.googleapis.com/oauth2/v2/userinfo";

describe("auth routes", () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		await resetDatabase();
		app = await startApp();
	});

	afterAll(() => stopApp(app));

	it("redirects Google sign-in to the provider", async () => {
		const res = await app.inject({ url: "/api/auth/google" });
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toContain("accounts.google.com");
		expect(res.headers.location).toContain("client_id=google-id");
	});

	it("signs in with Google, sets the refresh cookie and rotates it on refresh", async () => {
		stubProvider({ [GOOGLE_USER]: { id: "g-1", email: "me@example.com", verified_email: true } });
		const callback = await app.inject({ url: "/api/auth/google/callback" });
		expect(callback.statusCode).toBe(302);
		expect(callback.headers.location).toBe("http://localhost:3051/p/login");
		expect(String(callback.headers["set-cookie"])).toMatch(
			/einbuergerungstest_refresh=.+; Path=\/api\/auth; Max-Age=\d+; HttpOnly; SameSite=Lax/,
		);

		const first = cookieOf(callback.headers["set-cookie"]);
		const refreshed = await app.inject({
			method: "POST",
			url: "/api/auth/refresh",
			headers: { ...header, cookie: first },
		});
		expect(refreshed.statusCode).toBe(200);
		const { accessToken } = refreshed.json();
		expect(app.jwt.verify<{ id: string }>(accessToken).id).toBeTypeOf("string");
		expect(cookieOf(refreshed.headers["set-cookie"])).not.toBe(first);

		const second = cookieOf(refreshed.headers["set-cookie"]);
		const replay = await app.inject({
			method: "POST",
			url: "/api/auth/refresh",
			headers: { ...header, cookie: first },
		});
		expect(replay.statusCode).toBe(401);
		expect(replay.json()).toMatchObject({ code: "invalid_refresh_token" });
		expect(String(replay.headers["set-cookie"])).toContain("Max-Age=0");
		const successor = await app.inject({
			method: "POST",
			url: "/api/auth/refresh",
			headers: { ...header, cookie: second },
		});
		expect(successor.statusCode).toBe(401);

		const me = await app.inject({ url: "/api/me", headers: { authorization: `Bearer ${accessToken}` } });
		expect(me.json()).toMatchObject({ email: "me@example.com" });
	});

	it("refuses an unverified provider email", async () => {
		stubProvider({ [GOOGLE_USER]: { id: "g-2", email: "x@example.com", verified_email: false } });
		const res = await app.inject({ url: "/api/auth/google/callback" });
		expect(res.headers.location).toBe("http://localhost:3051/p/login?error=unverified_email");
		expect(res.headers["set-cookie"]).toBeUndefined();
	});

	it("redirects with an error when the provider exchange fails", async () => {
		const failing = await startApp({
			auth: {
				exchange: async () => {
					throw new Error("bad code");
				},
			},
		});
		const res = await failing.inject({ url: "/api/auth/google/callback" });
		expect(res.headers.location).toBe("http://localhost:3051/p/login?error=oauth_failed");
		await failing.close();
	});

	it("keeps the old refresh token valid when rotating fails midway", async () => {
		stubProvider({ [GOOGLE_USER]: { id: "g-5", email: "atomic@example.com", verified_email: true } });
		const cookie = cookieOf((await app.inject({ url: "/api/auth/google/callback" })).headers["set-cookie"]);
		const spy = vi.spyOn(tokens, "issueRefreshToken").mockRejectedValueOnce(new Error("database down"));
		const failed = await app.inject({ method: "POST", url: "/api/auth/refresh", headers: { ...header, cookie } });
		expect(failed.statusCode).toBe(500);
		spy.mockRestore();
		const retry = await app.inject({ method: "POST", url: "/api/auth/refresh", headers: { ...header, cookie } });
		expect(retry.statusCode).toBe(200);
	});

	it("requires the request header and a valid cookie to refresh", async () => {
		const missingHeader = await app.inject({ method: "POST", url: "/api/auth/refresh" });
		expect(missingHeader.statusCode).toBe(403);
		expect(missingHeader.json()).toMatchObject({ code: "missing_header" });
		expect((await app.inject({ method: "POST", url: "/api/auth/refresh", headers: header })).statusCode).toBe(401);
		expect(
			(
				await app.inject({
					method: "POST",
					url: "/api/auth/refresh",
					headers: { ...header, cookie: "einbuergerungstest_refresh=bogus" },
				})
			).statusCode,
		).toBe(401);
	});

	it("logs out by revoking the refresh token", async () => {
		stubProvider({ [GOOGLE_USER]: { id: "g-3", email: "out@example.com", verified_email: true } });
		const cookie = cookieOf((await app.inject({ url: "/api/auth/google/callback" })).headers["set-cookie"]);
		expect((await app.inject({ method: "POST", url: "/api/auth/logout" })).statusCode).toBe(403);
		const out = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { ...header, cookie } });
		expect(out.json()).toEqual({ success: true });
		expect(String(out.headers["set-cookie"])).toContain("Max-Age=0");
		expect(
			(await app.inject({ method: "POST", url: "/api/auth/refresh", headers: { ...header, cookie } })).statusCode,
		).toBe(401);
		expect((await app.inject({ method: "POST", url: "/api/auth/logout", headers: header })).statusCode).toBe(200);
	});

	it("rejects a refresh for a deleted user", async () => {
		stubProvider({ [GOOGLE_USER]: { id: "g-4", email: "gone@example.com", verified_email: true } });
		const cookie = cookieOf((await app.inject({ url: "/api/auth/google/callback" })).headers["set-cookie"]);
		const { getEm } = await import("@/db/orm");
		await getEm().getConnection().execute("delete from users where email = 'gone@example.com'");
		expect(
			(await app.inject({ method: "POST", url: "/api/auth/refresh", headers: { ...header, cookie } })).statusCode,
		).toBe(401);
	});

	it("does not offer Google sign-in while the client is not configured", async () => {
		vi.resetModules();
		vi.stubEnv("GOOGLE_CLIENT_ID", "");
		const { buildServer } = await import("@/server");
		const bare = await buildServer();
		expect((await bare.inject({ url: "/api/auth/google" })).statusCode).toBe(404);
		await bare.close();
		vi.unstubAllEnvs();
		vi.resetModules();
	});
});
