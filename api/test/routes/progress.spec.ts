import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bearer, startApp, stopApp } from "../_helpers/server";
import { resetDatabase, seedUser, withClient } from "#testdb";
import { submission } from "../_helpers/exam";

describe("progress route", () => {
	let app: FastifyInstance;
	let userId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "learner"));
		app = await startApp();
	});

	afterAll(() => stopApp(app));

	it("needs a token", async () => {
		expect((await app.inject({ method: "DELETE", url: "/api/progress" })).statusCode).toBe(401);
	});

	it("forgets answers, exams and seed, and keeps the account", async () => {
		const headers = bearer(app, userId);
		await app.inject({
			method: "POST",
			url: "/api/answers",
			headers,
			payload: { questionId: "1", chosen: 0, source: "practice" },
		});
		const { id } = (await app.inject({ method: "POST", url: "/api/exams", headers })).json();
		await app.inject({ method: "POST", url: `/api/exams/${id}/finish`, headers, payload: submission(20) });
		const seed = (await app.inject({ url: "/api/seed", headers })).json().seed;
		const res = await app.inject({ method: "DELETE", url: "/api/progress", headers });
		expect(res.json()).toEqual({ success: true });
		expect((await app.inject({ url: "/api/answers", headers })).json()).toEqual([]);
		expect((await app.inject({ url: "/api/exams", headers })).json()).toEqual([]);
		expect((await app.inject({ url: "/api/me", headers })).statusCode).toBe(200);
		expect((await app.inject({ url: "/api/seed", headers })).json().seed).not.toBe(seed);
	});
});
