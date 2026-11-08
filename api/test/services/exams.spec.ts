import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getEm } from "@/db/orm";
import { finishExam, GRACE_MS, listExams, startExam } from "@/services/exams";
import { listAnswers } from "@/services/answers";
import { closeOrm, initOrm, resetDatabase, seedUser, withClient } from "#testdb";
import { EXAM_IDS, submission } from "../_helpers/exam";

const MINUTE = 60_000;

describe("exams service", () => {
	let userId: string;
	let otherId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "exams"));
		otherId = await withClient((client) => seedUser(client, "intruder"));
		await initOrm();
	});

	afterAll(closeOrm);

	it("starts an exam and lists it only once it is finished", async () => {
		const started = await startExam(getEm(), userId);
		expect(started.startedAt).toBeTypeOf("number");
		expect(await listExams(getEm(), userId)).toEqual([]);
		const result = await finishExam(getEm(), userId, started.id, submission(20));
		expect(result).toMatchObject({ score: 20, passed: true });
		expect(result.wrong).toHaveLength(13);
		const [listed] = await listExams(getEm(), userId);
		expect(listed).toMatchObject({ id: started.id, score: 20, passed: true });
		expect(listed.finishedAt).toBeGreaterThanOrEqual(listed.startedAt);
	});

	it("stores the final answers as exam answers and feeds the history", async () => {
		const started = await startExam(getEm(), userId);
		await finishExam(getEm(), userId, started.id, submission(5));
		const stored = (await listAnswers(getEm(), userId)).filter((answer) => answer.examId === started.id);
		expect(stored).toHaveLength(33);
		expect(stored.every((answer) => answer.source === "exam")).toBe(true);
		expect(stored.filter((answer) => answer.correct)).toHaveLength(5);
	});

	it("passes at 17 and fails at 16, and leaves unanswered questions out but counts them wrong", async () => {
		const pass = await startExam(getEm(), userId);
		expect(await finishExam(getEm(), userId, pass.id, submission(17))).toMatchObject({ score: 17, passed: true });
		const fail = await startExam(getEm(), userId);
		expect(await finishExam(getEm(), userId, fail.id, submission(16))).toMatchObject({ score: 16, passed: false });
		const partial = await startExam(getEm(), userId);
		const half = submission(33);
		half.answers = half.answers.slice(0, 20);
		expect(await finishExam(getEm(), userId, partial.id, half)).toMatchObject({ score: 20, passed: true });
		expect((await listAnswers(getEm(), userId)).filter((answer) => answer.examId === partial.id)).toHaveLength(20);
		const empty = await startExam(getEm(), userId);
		expect(await finishExam(getEm(), userId, empty.id, { questionIds: EXAM_IDS, answers: [] })).toMatchObject({
			score: 0,
			passed: false,
		});
	});

	it("is for the owner only, and only once", async () => {
		const started = await startExam(getEm(), userId);
		await expect(finishExam(getEm(), otherId, started.id, submission(33))).rejects.toMatchObject({
			code: "exam_not_found",
		});
		await expect(finishExam(getEm(), userId, 999999, submission(33))).rejects.toMatchObject({
			code: "exam_not_found",
		});
		await finishExam(getEm(), userId, started.id, submission(33));
		await expect(finishExam(getEm(), userId, started.id, submission(33))).rejects.toMatchObject({
			code: "exam_finished",
			statusCode: 409,
		});
	});

	it("refuses a submission after the time limit and its grace, and takes one just inside", async () => {
		const late = await startExam(getEm(), userId);
		const [row] = await getEm().find((await import("@/db/entities")).Exams, { id: late.id });
		const limit = 60 * MINUTE + GRACE_MS;
		await expect(
			finishExam(getEm(), userId, late.id, submission(33), new Date(row.started_at.getTime() + limit + 1)),
		).rejects.toMatchObject({ code: "exam_expired" });
		await expect(
			finishExam(getEm(), userId, late.id, submission(33), new Date(row.started_at.getTime() + limit)),
		).resolves.toMatchObject({ score: 33 });
	});

	it.each([
		["too few questions", { questionIds: EXAM_IDS.slice(1), answers: [] }],
		["a repeated question", { questionIds: [...EXAM_IDS.slice(0, 32), "1"], answers: [] }],
		[
			"the wrong split of general and state questions",
			{ questionIds: [...EXAM_IDS.slice(0, 29), "NW-4", "NW-1", "NW-2", "NW-3"].slice(0, 33), answers: [] },
		],
		[
			"answers for a question that is not in the exam",
			{ questionIds: EXAM_IDS, answers: [{ questionId: "100", chosen: 0 }] },
		],
		[
			"two answers for one question",
			{
				questionIds: EXAM_IDS,
				answers: [
					{ questionId: "1", chosen: 0 },
					{ questionId: "1", chosen: 1 },
				],
			},
		],
	])("refuses %s", async (_name, bad) => {
		const started = await startExam(getEm(), userId);
		await expect(finishExam(getEm(), userId, started.id, bad)).rejects.toMatchObject({ statusCode: 400 });
	});
});
