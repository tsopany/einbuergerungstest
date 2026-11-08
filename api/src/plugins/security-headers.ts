import type { FastifyInstance } from "fastify";

const CSP = "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function addSecurityHeaders(app: FastifyInstance): void {
	app.addHook("onSend", async (request, reply, payload) => {
		reply.header("Content-Security-Policy", CSP);
		reply.header("X-Content-Type-Options", "nosniff");
		reply.header("Referrer-Policy", "no-referrer");
		reply.header("X-Frame-Options", "DENY");
		if (request.url.startsWith("/api/") && !reply.hasHeader("Cache-Control"))
			reply.header("Cache-Control", "no-store");
		return payload;
	});
}
