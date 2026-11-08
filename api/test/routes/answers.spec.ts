import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { questionById } from "@/services/questions";
import { bearer, startApp, stopApp } from "../_helpers/server";
import { resetDatabase, seedUser, withClient } from "#testdb";

describe("answer routes", () => {
	let app: FastifyInstance;
	let userId: string;
	let otherId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "answerer"));
		otherId = await withClient((client) => seedUser(client, "other"));
		app = await startApp();
	});

	afterAll(() => stopApp(app));

	const post = (payload: unknown, id = userId) =>
		app.inject({ method: "POST", url: "/api/answers", headers: bearer(app, id), payload: payload as object });

	it("needs a token", async () => {
		expect((await app.inject({ url: "/api/answers" })).statusCode).toBe(401);
		expect((await app.inject({ method: "POST", url: "/api/answers", payload: {} })).statusCode).toBe(401);
	});

	it("stores an answer, says if it was right and lists it", async () => {
		const key = questionById.get("1")!.correct;
		const right = await post({ questionId: "1", chosen: key, source: "practice" });
		expect(right.statusCode).toBe(201);
		expect(right.json()).toEqual({ correct: true, correctIndex: key });
		const wrong = await post({
			questionId: "NW-1",
			chosen: (questionById.get("NW-1")!.correct + 1) % 4,
			source: "weak",
		});
		expect(wrong.json()).toMatchObject({ correct: false });
		expect((await post({ questionId: "1", chosen: key, source: "easy" })).statusCode).toBe(201);
		const list = await app.inject({ url: "/api/answers", headers: bearer(app, userId) });
		expect(list.json()).toMatchObject([
			{ questionId: "1", chosen: key, correct: true, source: "practice", examId: null },
			{ questionId: "NW-1", correct: false, source: "weak" },
			{ questionId: "1", correct: true, source: "easy" },
		]);
	});

	it("keeps answers of different users apart", async () => {
		await post({ questionId: "2", chosen: 0, source: "practice" }, otherId);
		const mine = (await app.inject({ url: "/api/answers", headers: bearer(app, userId) })).json();
		const theirs = (await app.inject({ url: "/api/answers", headers: bearer(app, otherId) })).json();
		expect(mine.map((answer: { questionId: string }) => answer.questionId)).not.toContain("2");
		expect(theirs).toHaveLength(1);
	});

	it.each([
		["an unknown question id", { questionId: "999", chosen: 0, source: "practice" }],
		["an id in the wrong format", { questionId: "abc", chosen: 0, source: "practice" }],
		["a choice above 3", { questionId: "1", chosen: 4, source: "practice" }],
		["a negative choice", { questionId: "1", chosen: -1, source: "practice" }],
		["a fractional choice", { questionId: "1", chosen: 1.5, source: "practice" }],
		["the exam source, which only exams may write", { questionId: "1", chosen: 0, source: "exam" }],
		["a missing source", { questionId: "1", chosen: 0 }],
		["no body", undefined],
	])("rejects %s", async (_name, payload) => {
		const res = await post(payload);
		expect(res.statusCode).toBe(400);
		expect(res.json()).toMatchObject({ code: "validation_error" });
	});
});
