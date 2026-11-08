import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getEm } from "@/db/orm";
import { authenticate } from "@/middleware/authenticate";
import { listAnswers, recordAnswer } from "@/services/answers";
import { isQuestionId } from "#shared/question";

const body = z.object({
	questionId: z.string().refine(isQuestionId, "Unknown question id"),
	chosen: z.number().int().min(0).max(3),
	source: z.enum(["practice", "weak"]),
});

export default async function answerRoutes(app: FastifyInstance) {
	app.get("/answers", { preHandler: authenticate }, async (request) => listAnswers(getEm(), request.user.id));

	app.post("/answers", { preHandler: authenticate }, async (request, reply) =>
		reply.status(201).send(await recordAnswer(getEm(), request.user.id, body.parse(request.body))),
	);
}
