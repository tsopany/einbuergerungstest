import { z } from "zod";
import { QUESTION_COUNT, idNumber } from "./ids";

export * from "./ids";

export const questionSchema = z
	.object({
		id: z.string(),
		part: z.enum(["general", "state"]),
		text: z.string().trim().min(1),
		options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
		correct: z.number().int().min(0).max(3),
		images: z.array(z.string().regex(/^(?:NW-)?\d{1,3}-[1-4]\.png$/)),
		credit: z.string().min(1).optional(),
	})
	.refine((question) => idNumber(question.id)?.part === question.part, { message: "id does not match part" });

export const questionsSchema = z
	.array(questionSchema)
	.length(QUESTION_COUNT)
	.refine((questions) => new Set(questions.map((question) => question.id)).size === questions.length, {
		message: "duplicate question id",
	});

export type Question = z.infer<typeof questionSchema>;
