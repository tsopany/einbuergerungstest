import type { FastifyReply, FastifyRequest } from "fastify";
import { errorBody } from "@/errors";

declare module "@fastify/jwt" {
	interface FastifyJWT {
		payload: { id: string };
		user: { id: string };
	}
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	try {
		await request.jwtVerify();
	} catch {
		await reply.status(401).send(errorBody(401, "unauthorized", "Invalid or missing token"));
	}
}
