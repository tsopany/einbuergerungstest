import type { FastifyInstance } from "fastify";
import { getEm } from "@/db/orm";
import { authenticate } from "@/middleware/authenticate";
import { resetProgress } from "@/services/progress";

export default async function progressRoutes(app: FastifyInstance) {
	app.delete("/progress", { preHandler: authenticate }, async (request) => {
		await resetProgress(getEm(), request.user.id);
		return { success: true };
	});
}
