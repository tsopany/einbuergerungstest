import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { NotFoundError } from "@/errors";
import { buildServer } from "@/server";

describe("server", () => {
	let app: Awaited<ReturnType<typeof buildServer>>;

	afterEach(async () => {
		await app.close();
	});

	it("should answer /api/health", async () => {
		app = await buildServer();
		const res = await app.inject({ method: "GET", url: "/api/health" });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ status: "ok" });
	});

	it("answers credentialed CORS for the frontend origin only", async () => {
		app = await buildServer();
		const ok = await app.inject({ url: "/api/health", headers: { origin: "http://localhost:3051" } });
		expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:3051");
		expect(ok.headers["access-control-allow-credentials"]).toBe("true");
		const other = await app.inject({ url: "/api/health", headers: { origin: "https://evil.example" } });
		expect(other.headers["access-control-allow-origin"]).toBe("http://localhost:3051");
	});

	it("maps application, validation and unexpected errors", async () => {
		app = await buildServer();
		app.get("/boom/app", async () => {
			throw new NotFoundError("nope");
		});
		app.get("/boom/zod", async () => z.string().parse(1));
		app.get("/boom/crash", async () => {
			throw new Error("secret detail");
		});
		app.get("/boom/client", async () => {
			throw Object.assign(new Error("bad thing"), { statusCode: 400 });
		});
		expect((await app.inject({ url: "/boom/app" })).json()).toEqual({
			statusCode: 404,
			error: "Not Found",
			code: "not_found",
			message: "nope",
		});
		const invalid = await app.inject({ url: "/boom/zod" });
		expect(invalid.statusCode).toBe(400);
		expect(invalid.json()).toMatchObject({
			error: "Bad Request",
			code: "validation_error",
			issues: expect.any(Array),
		});
		const crash = await app.inject({ url: "/boom/crash" });
		expect(crash.statusCode).toBe(500);
		expect(crash.json()).toMatchObject({ error: "Internal Server Error", code: "internal_error" });
		expect(crash.body).not.toContain("secret detail");
		expect((await app.inject({ url: "/boom/client" })).json()).toMatchObject({
			statusCode: 400,
			code: "bad_request",
			message: "bad thing",
		});
	});

	it("guards every route but the probe: a foreign origin is refused before anything else runs", async () => {
		app = await buildServer();
		const foreign = await app.inject({
			method: "POST",
			url: "/api/auth/refresh",
			headers: { origin: "https://evil.example" },
		});
		expect(foreign.statusCode).toBe(403);
		expect(foreign.json()).toMatchObject({ code: "origin_not_allowed" });
		const own = await app.inject({
			method: "POST",
			url: "/api/auth/refresh",
			headers: { origin: "http://localhost:3051" },
		});
		expect(own.statusCode).toBe(403);
		expect(own.json()).toMatchObject({ code: "missing_header" });
	});

	it("answers a rate limited request in the app's error shape, with a retry hint", async () => {
		app = await buildServer();
		let last = 200;
		let body = {} as Record<string, unknown>;
		for (let n = 0; n < 205 && last !== 429; n += 1) {
			const res = await app.inject({ url: "/api/me" });
			last = res.statusCode;
			body = res.json();
		}
		expect(last).toBe(429);
		expect(body).toMatchObject({ statusCode: 429, code: "too_many_requests" });
	});

	describe("behind a trusted proxy", () => {
		afterEach(() => {
			vi.unstubAllEnvs();
			vi.resetModules();
		});

		const exhaust = async (instance: FastifyInstance, forwardedFor: string) => {
			let last = 200;
			for (let n = 0; n < 205 && last !== 429; n += 1) {
				last = (
					await instance.inject({
						url: "/api/me",
						remoteAddress: "127.0.0.1",
						headers: { "x-forwarded-for": forwardedFor },
					})
				).statusCode;
			}
			return last;
		};

		it("gives each forwarded client its own rate limit bucket when the proxy is trusted", async () => {
			vi.stubEnv("TRUSTED_PROXIES", "loopback");
			vi.resetModules();
			const { buildServer: build } = await import("@/server");
			app = await build();
			expect(await exhaust(app, "203.0.113.7")).toBe(429);
			const other = await app.inject({
				url: "/api/me",
				remoteAddress: "127.0.0.1",
				headers: { "x-forwarded-for": "203.0.113.8" },
			});
			expect(other.statusCode).toBe(401);
		});

		it("ignores forwarded addresses from a proxy that is not trusted: everyone shares the sender's bucket", async () => {
			app = await buildServer();
			expect(await exhaust(app, "203.0.113.7")).toBe(429);
			const other = await app.inject({
				url: "/api/me",
				remoteAddress: "127.0.0.1",
				headers: { "x-forwarded-for": "203.0.113.8" },
			});
			expect(other.statusCode).toBe(429);
		});
	});
});
