import type { FastifyInstance } from "fastify";

export default async function healthRoutes(app: FastifyInstance) {
	app.get("/health", { config: { rateLimit: false } }, async () => ({ status: "ok" }));
}
