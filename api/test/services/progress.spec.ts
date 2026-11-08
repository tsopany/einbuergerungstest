import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getEm } from "@/db/orm";
import { listAnswers, recordAnswer } from "@/services/answers";
import { finishExam, listExams, startExam } from "@/services/exams";
import { resetProgress } from "@/services/progress";
import { seedFor } from "@/services/seed";
import { findUser } from "@/services/users";
import { closeOrm, initOrm, resetDatabase, seedUser, withClient } from "#testdb";
import { submission } from "../_helpers/exam";

describe("resetProgress", () => {
	let userId: string;
	let otherId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "reset"));
		otherId = await withClient((client) => seedUser(client, "keeper"));
		await initOrm();
	});

	afterAll(closeOrm);

	it("clears answers, exams and seed of one user and keeps the account and everyone else", async () => {
		for (const id of [userId, otherId]) {
			await recordAnswer(getEm(), id, { questionId: "1", chosen: 0, source: "practice" });
			await finishExam(getEm(), id, (await startExam(getEm(), id)).id, submission(20));
			await seedFor(getEm(), id);
		}
		const keptSeed = await seedFor(getEm(), otherId);
		await resetProgress(getEm(), userId);
		expect(await listAnswers(getEm(), userId)).toEqual([]);
		expect(await listExams(getEm(), userId)).toEqual([]);
		expect(await findUser(getEm(), userId)).not.toBeNull();
		expect(await listAnswers(getEm(), otherId)).toHaveLength(34);
		expect(await listExams(getEm(), otherId)).toHaveLength(1);
		expect(await seedFor(getEm(), otherId)).toBe(keptSeed);
	});
});
