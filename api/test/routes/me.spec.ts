import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bearer, startApp, stopApp } from "../_helpers/server";
import { resetDatabase, seedUser, withClient } from "#testdb";

describe("me route", () => {
	let app: FastifyInstance;
	let userId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "me"));
		app = await startApp();
	});

	afterAll(() => stopApp(app));

	it("requires a token", async () => {
		expect((await app.inject({ url: "/api/me" })).statusCode).toBe(401);
	});

	it("returns the signed-in profile", async () => {
		const res = await app.inject({ url: "/api/me", headers: bearer(app, userId) });
		expect(res.json()).toEqual({ id: userId, email: "me@example.com" });
	});

	it("answers 404 for a token whose user is gone", async () => {
		const res = await app.inject({
			url: "/api/me",
			headers: bearer(app, "00000000-0000-0000-0000-000000000000"),
		});
		expect(res.statusCode).toBe(404);
	});

	it("deletes the account with its data, ends the session and then answers 404", async () => {
		const leaving = await withClient((client) => seedUser(client, "leaving"));
		const headers = bearer(app, leaving);
		await app.inject({
			method: "POST",
			url: "/api/answers",
			headers,
			payload: { questionId: "1", chosen: 0, source: "practice" },
		});
		const res = await app.inject({ method: "DELETE", url: "/api/me", headers });
		expect(res.json()).toEqual({ success: true });
		expect(String(res.headers["set-cookie"])).toContain("Max-Age=0");
		expect((await app.inject({ url: "/api/me", headers })).statusCode).toBe(404);
		expect((await app.inject({ method: "DELETE", url: "/api/me" })).statusCode).toBe(401);
		const rows = await withClient(
			async (client) => (await client.query("select 1 from answers where user_id = $1", [leaving])).rows,
		);
		expect(rows).toEqual([]);
	});
});
