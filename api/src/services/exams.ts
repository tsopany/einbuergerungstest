import type { EntityManager } from "@mikro-orm/postgresql";
import { Answers, Exams } from "@/db/entities";
import { AppError, ConflictError, NotFoundError } from "@/errors";
import { questionById } from "@/services/questions";
import { scoreExam } from "#shared/exam";
import { EXAM, idNumber } from "#shared/question";

/** The client auto-submits at the time limit; this much more is allowed for the request to arrive. */
export const GRACE_MS = 2 * 60 * 1000;

export type ExamSubmission = { questionIds: string[]; answers: { questionId: string; chosen: number }[] };

export async function startExam(em: EntityManager, userId: string) {
	const id = await em.insert(Exams, { user_id: userId });
	const exam = await em.findOneOrFail(Exams, { id }, { refresh: true });
	return { id: exam.id, startedAt: exam.started_at.getTime() };
}

export async function listExams(em: EntityManager, userId: string) {
	const rows = await em.find(
		Exams,
		{ user_id: userId, finished_at: { $ne: null } },
		{ orderBy: { started_at: "desc" } },
	);
	return rows.map((row) => ({
		id: row.id,
		startedAt: row.started_at.getTime(),
		finishedAt: (row.finished_at as Date).getTime(),
		score: row.score as number,
		passed: row.passed as boolean,
	}));
}

function checkShape({ questionIds, answers }: ExamSubmission): void {
	const parts = questionIds.map((id) => idNumber(id)?.part);
	const valid =
		new Set(questionIds).size === EXAM.total &&
		questionIds.length === EXAM.total &&
		parts.filter((part) => part === "general").length === EXAM.general &&
		parts.filter((part) => part === "state").length === EXAM.state &&
		questionIds.every((id) => questionById.has(id));
	if (!valid) throw new AppError(400, "An exam is 30 general and 3 state questions, all different", "invalid_exam");
	const given = answers.map((answer) => answer.questionId);
	if (new Set(given).size !== given.length || given.some((id) => !questionIds.includes(id)))
		throw new AppError(400, "Answers must be for distinct questions of the exam", "invalid_exam_answers");
}

/** Marks the exam finished and stores the final answers; only the owner can, once, within the time limit. */
export async function finishExam(
	em: EntityManager,
	userId: string,
	examId: number,
	submission: ExamSubmission,
	now = new Date(),
) {
	checkShape(submission);
	const exam = await em.findOne(Exams, { id: examId, user_id: userId });
	if (!exam) throw new NotFoundError("Exam not found", "exam_not_found");
	if (exam.finished_at) throw new ConflictError("Exam already finished", "exam_finished");
	if (now.getTime() - exam.started_at.getTime() > EXAM.minutes * 60_000 + GRACE_MS)
		throw new ConflictError("The time limit is over", "exam_expired");
	const chosen = new Map(submission.answers.map((answer) => [answer.questionId, answer.chosen]));
	const result = scoreExam(
		submission.questionIds.map((id) => questionById.get(id)!),
		chosen,
	);
	await em.transactional(async (tx) => {
		const updated = await tx.nativeUpdate(
			Exams,
			{ id: examId, user_id: userId, finished_at: null },
			{ finished_at: now, score: result.score, passed: result.passed },
		);
		if (!updated) throw new ConflictError("Exam already finished", "exam_finished");
		if (submission.answers.length)
			await tx.insertMany(
				Answers,
				submission.answers.map((answer) => ({
					user_id: userId,
					question_id: answer.questionId,
					chosen: answer.chosen,
					correct: answer.chosen === questionById.get(answer.questionId)!.correct,
					answered_at: now,
					source: "exam",
					exam_id: examId,
				})),
			);
	});
	return {
		score: result.score,
		passed: result.passed,
		wrong: result.wrong.map((id) => ({ questionId: id, correctIndex: questionById.get(id)!.correct })),
	};
}
