import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getEm } from "@/db/orm";
import { authenticate } from "@/middleware/authenticate";
import { finishExam, listExams, startExam } from "@/services/exams";
import { isQuestionId } from "#shared/question";

const questionId = z.string().refine(isQuestionId, "Unknown question id");
const params = z.object({ id: z.coerce.number().int().positive() });
const submission = z.object({
	questionIds: z.array(questionId).max(33),
	answers: z.array(z.object({ questionId, chosen: z.number().int().min(0).max(3) })).max(33),
});

export default async function examRoutes(app: FastifyInstance) {
	app.get("/exams", { preHandler: authenticate }, async (request) => listExams(getEm(), request.user.id));

	app.post("/exams", { preHandler: authenticate }, async (request, reply) =>
		reply.status(201).send(await startExam(getEm(), request.user.id)),
	);

	app.post("/exams/:id/finish", { preHandler: authenticate }, async (request) =>
		finishExam(getEm(), request.user.id, params.parse(request.params).id, submission.parse(request.body)),
	);
}
