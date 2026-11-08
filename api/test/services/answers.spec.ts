import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getEm } from "@/db/orm";
import { listAnswers, recordAnswer } from "@/services/answers";
import { questionById } from "@/services/questions";
import { closeOrm, initOrm, resetDatabase, seedUser, withClient } from "#testdb";

describe("answers service", () => {
	let userId: string;
	let otherId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "answers"));
		otherId = await withClient((client) => seedUser(client, "other"));
		await initOrm();
	});

	afterAll(closeOrm);

	it("decides on the server whether an answer was right and says which one was", async () => {
		const key = questionById.get("1")!.correct;
		expect(await recordAnswer(getEm(), userId, { questionId: "1", chosen: key, source: "practice" })).toEqual({
			correct: true,
			correctIndex: key,
		});
		expect(await recordAnswer(getEm(), userId, { questionId: "1", chosen: (key + 1) % 4, source: "weak" })).toEqual(
			{ correct: false, correctIndex: key },
		);
	});

	it("refuses an unknown question", async () => {
		await expect(
			recordAnswer(getEm(), userId, { questionId: "999", chosen: 0, source: "practice" }),
		).rejects.toMatchObject({ code: "unknown_question", statusCode: 404 });
	});

	it("lists only the user's own answers, oldest first", async () => {
		await recordAnswer(getEm(), otherId, { questionId: "2", chosen: 0, source: "practice" });
		const list = await listAnswers(getEm(), userId);
		expect(list.map((answer) => [answer.questionId, answer.source, answer.examId])).toEqual([
			["1", "practice", null],
			["1", "weak", null],
		]);
		expect(list[0].answeredAt).toBeLessThanOrEqual(list[1].answeredAt);
		expect(list[0].answeredAt).toBeTypeOf("number");
		expect(await listAnswers(getEm(), "00000000-0000-0000-0000-000000000000")).toEqual([]);
	});
});
