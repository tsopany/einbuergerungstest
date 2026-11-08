import fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { errorBody, AppError } from "@/errors";
import { addRequestGuard, type GuardOptions } from "@/plugins/request-guard";

const base: GuardOptions = {
	requireHttps: true,
	trustedHosts: ["test.local"],
	trustedOrigins: ["https://test.local"],
};

describe("request guard", () => {
	let app: FastifyInstance;

	afterEach(() => app.close());

	async function build(options: Partial<GuardOptions> = {}) {
		app = fastify({ trustProxy: true });
		app.setErrorHandler((error, _request, reply) => {
			if (error instanceof AppError)
				return reply.status(error.statusCode).send(errorBody(error.statusCode, error.code, error.message));
			return reply.status(500).send({});
		});
		addRequestGuard(app, { ...base, ...options });
		for (const path of ["/api/health", "/api/x"]) app.all(path, async () => ({ ok: true }));
		await app.ready();
	}

	const send = (path: string, headers: Record<string, string> = {}, method: "GET" | "POST" = "POST") =>
		app.inject({
			method,
			url: path,
			headers: { host: "test.local", "x-forwarded-proto": "https", origin: "https://test.local", ...headers },
		});

	it("lets a trusted request through", async () => {
		await build();
		expect((await send("/api/x")).statusCode).toBe(200);
		expect((await send("/api/x", { origin: "" }, "GET")).statusCode).toBe(200);
	});

	it("refuses plain http in production", async () => {
		await build();
		const res = await send("/api/x", { "x-forwarded-proto": "http" });
		expect(res.statusCode).toBe(400);
		expect(res.json()).toMatchObject({ code: "https_required" });
	});

	it("allows plain http when https is not required", async () => {
		await build({ requireHttps: false });
		expect((await send("/api/x", { "x-forwarded-proto": "http" })).statusCode).toBe(200);
	});

	it("refuses a host that is not trusted, with or without a port, and ignores case", async () => {
		await build();
		const res = await send("/api/x", { host: "evil.test" });
		expect(res.statusCode).toBe(400);
		expect(res.json()).toMatchObject({ code: "host_not_allowed" });
		expect((await send("/api/x", { host: "evil.test:443" })).statusCode).toBe(400);
		expect((await send("/api/x", { host: "TEST.local:8443" })).statusCode).toBe(200);
	});

	it("matches bracketed ipv6 hosts, with or without a port, and not their prefix", async () => {
		await build({ trustedHosts: ["[::1]"] });
		expect((await send("/api/x", { host: "[::1]" })).statusCode).toBe(200);
		expect((await send("/api/x", { host: "[::1]:8115" })).statusCode).toBe(200);
		expect((await send("/api/x", { host: "[::2]:8095" })).statusCode).toBe(400);
		expect((await send("/api/x", { host: "[::1" })).statusCode).toBe(400);
	});

	it("checks no host when none are configured", async () => {
		await build({ trustedHosts: [] });
		expect((await send("/api/x", { host: "anything.test" })).statusCode).toBe(200);
	});

	it("refuses an origin that is not trusted, including the literal null origin", async () => {
		await build();
		for (const origin of ["https://evil.test", "null", "https://test.local:8443"]) {
			const res = await send("/api/x", { origin });
			expect(res.statusCode).toBe(403);
			expect(res.json()).toMatchObject({ code: "origin_not_allowed" });
		}
	});

	it("never blocks the health probe", async () => {
		await build();
		const res = await send(
			"/api/health",
			{ host: "probe.internal", "x-forwarded-proto": "http", origin: "https://evil.test" },
			"GET",
		);
		expect(res.statusCode).toBe(200);
	});
});
