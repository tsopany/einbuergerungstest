import type { FastifyInstance } from "fastify";
import { getEm } from "@/db/orm";
import { authenticate } from "@/middleware/authenticate";
import { seedFor } from "@/services/seed";

export default async function seedRoutes(app: FastifyInstance) {
	app.get("/seed", { preHandler: authenticate }, async (request) => ({
		seed: await seedFor(getEm(), request.user.id),
	}));
}
