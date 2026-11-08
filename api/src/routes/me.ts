import type { FastifyInstance } from "fastify";
import { clearedRefreshCookie } from "@/auth/refresh-cookie";
import { getEm } from "@/db/orm";
import { NotFoundError } from "@/errors";
import { authenticate } from "@/middleware/authenticate";
import { deleteUser, findUser, toProfile } from "@/services/users";

export default async function meRoutes(app: FastifyInstance) {
	app.get("/me", { preHandler: authenticate }, async (request) => {
		const user = await findUser(getEm(), request.user.id);
		if (!user) throw new NotFoundError("User not found");
		return toProfile(user);
	});

	app.delete("/me", { preHandler: authenticate }, async (request, reply) => {
		await deleteUser(getEm(), request.user.id);
		return reply.header("set-cookie", clearedRefreshCookie()).send({ success: true });
	});
}
