import { questionsSchema, type Question } from "#shared/question";
import catalogue from "#shared/questions.json" with { type: "json" };

export const questions: readonly Question[] = questionsSchema.parse(catalogue);

export const questionById: ReadonlyMap<string, Question> = new Map(
	questions.map((question) => [question.id, question]),
);
