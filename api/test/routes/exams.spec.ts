import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bearer, startApp, stopApp } from "../_helpers/server";
import { resetDatabase, seedUser, withClient } from "#testdb";
import { submission } from "../_helpers/exam";

describe("exam routes", () => {
	let app: FastifyInstance;
	let userId: string;
	let otherId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "examinee"));
		otherId = await withClient((client) => seedUser(client, "other"));
		app = await startApp();
	});

	afterAll(() => stopApp(app));

	const start = async (id = userId) =>
		(await app.inject({ method: "POST", url: "/api/exams", headers: bearer(app, id) })).json().id as number;
	const finish = (examId: number | string, payload: unknown, id = userId) =>
		app.inject({
			method: "POST",
			url: `/api/exams/${examId}/finish`,
			headers: bearer(app, id),
			payload: payload as object,
		});

	it("needs a token", async () => {
		expect((await app.inject({ url: "/api/exams" })).statusCode).toBe(401);
		expect((await app.inject({ method: "POST", url: "/api/exams" })).statusCode).toBe(401);
		expect((await app.inject({ method: "POST", url: "/api/exams/1/finish", payload: {} })).statusCode).toBe(401);
	});

	it("runs an exam from start to result and lists it", async () => {
		const started = await app.inject({ method: "POST", url: "/api/exams", headers: bearer(app, userId) });
		expect(started.statusCode).toBe(201);
		const { id, startedAt } = started.json();
		expect(startedAt).toBeTypeOf("number");
		const done = await finish(id, submission(18));
		expect(done.statusCode).toBe(200);
		expect(done.json()).toMatchObject({ score: 18, passed: true });
		expect(done.json().wrong).toHaveLength(15);
		expect(done.json().wrong[0]).toEqual({ questionId: expect.any(String), correctIndex: expect.any(Number) });
		const list = await app.inject({ url: "/api/exams", headers: bearer(app, userId) });
		expect(list.json()).toMatchObject([{ id, score: 18, passed: true }]);
		const answers = (await app.inject({ url: "/api/answers", headers: bearer(app, userId) })).json();
		expect(answers.filter((answer: { examId: number }) => answer.examId === id)).toHaveLength(33);
	});

	it("only lets the owner finish, and only once", async () => {
		const id = await start();
		expect((await finish(id, submission(33), otherId)).statusCode).toBe(404);
		expect((await finish(id, submission(33))).statusCode).toBe(200);
		const again = await finish(id, submission(33));
		expect(again.statusCode).toBe(409);
		expect(again.json()).toMatchObject({ code: "exam_finished" });
		expect((await app.inject({ url: "/api/exams", headers: bearer(app, otherId) })).json()).toEqual([]);
	});

	it.each([
		["a bad exam id", "abc", submission(33)],
		["an exam id of zero", "0", submission(33)],
		[
			"an unknown question in the exam",
			undefined,
			{ questionIds: ["x", ...submission(33).questionIds.slice(1)], answers: [] },
		],
		[
			"a choice above 3",
			undefined,
			{ questionIds: submission(33).questionIds, answers: [{ questionId: "1", chosen: 9 }] },
		],
		[
			"more than 33 answers",
			undefined,
			{
				questionIds: submission(33).questionIds,
				answers: Array.from({ length: 34 }, () => ({ questionId: "1", chosen: 0 })),
			},
		],
		["no body", undefined, undefined],
	])("rejects %s", async (_name, examId, payload) => {
		const id = examId ?? (await start());
		const res = await finish(id, payload);
		expect(res.statusCode).toBe(400);
	});

	it("refuses an exam that is not 30 general and 3 state questions", async () => {
		const id = await start();
		const res = await finish(id, { questionIds: submission(33).questionIds.slice(1), answers: [] });
		expect(res.statusCode).toBe(400);
		expect(res.json()).toMatchObject({ code: "invalid_exam" });
	});
});
