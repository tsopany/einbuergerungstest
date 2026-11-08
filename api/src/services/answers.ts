import type { EntityManager } from "@mikro-orm/postgresql";
import { Answers } from "@/db/entities";
import { NotFoundError } from "@/errors";
import { questionById } from "@/services/questions";

export type AnswerSource = "practice" | "weak" | "easy";

export type NewAnswer = { questionId: string; chosen: number; source: AnswerSource };

/** Stores one answer; the api decides whether it was right, never the client. */
export async function recordAnswer(em: EntityManager, userId: string, input: NewAnswer) {
	const question = questionById.get(input.questionId);
	if (!question) throw new NotFoundError("Unknown question", "unknown_question");
	const correct = input.chosen === question.correct;
	await em.insert(Answers, {
		user_id: userId,
		question_id: question.id,
		chosen: input.chosen,
		correct,
		source: input.source,
	});
	return { correct, correctIndex: question.correct };
}

export async function listAnswers(em: EntityManager, userId: string) {
	const rows = await em.find(Answers, { user_id: userId }, { orderBy: { answered_at: "asc", id: "asc" } });
	return rows.map((row) => ({
		questionId: row.question_id,
		chosen: row.chosen,
		correct: row.correct,
		answeredAt: row.answered_at.getTime(),
		source: row.source,
		examId: row.exam_id ?? null,
	}));
}
