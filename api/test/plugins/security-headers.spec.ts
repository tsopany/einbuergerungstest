import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { addSecurityHeaders } from "@/plugins/security-headers";
import { buildServer } from "@/server";

describe("addSecurityHeaders", () => {
	it("adds the headers and no-store to api responses, including /api/health", async () => {
		const app = await buildServer();
		const res = await app.inject({ url: "/api/health" });
		expect(res.headers).toMatchObject({
			"content-security-policy":
				"default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
			"x-content-type-options": "nosniff",
			"referrer-policy": "no-referrer",
			"x-frame-options": "DENY",
			"cache-control": "no-store",
		});
		await app.close();
	});

	it("keeps an explicit Cache-Control and skips no-store outside /api", async () => {
		const app = fastify();
		addSecurityHeaders(app);
		app.get("/api/cached", async (_request, reply) => reply.header("Cache-Control", "max-age=60").send("x"));
		app.get("/page", async () => "x");
		expect((await app.inject({ url: "/api/cached" })).headers["cache-control"]).toBe("max-age=60");
		const page = await app.inject({ url: "/page" });
		expect(page.headers["cache-control"]).toBeUndefined();
		expect(page.headers["x-content-type-options"]).toBe("nosniff");
		await app.close();
	});

	it("also covers error responses", async () => {
		const app = await buildServer();
		const res = await app.inject({ url: "/api/me" });
		expect(res.statusCode).toBe(401);
		expect(res.headers["x-frame-options"]).toBe("DENY");
		await app.close();
	});
});
