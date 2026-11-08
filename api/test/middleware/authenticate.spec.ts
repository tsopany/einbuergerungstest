import jwt from "@fastify/jwt";
import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { authenticate } from "@/middleware/authenticate";

async function app() {
	const server = fastify();
	await server.register(jwt, { secret: "x".repeat(32) });
	server.get("/who", { preHandler: authenticate }, async (request) => request.user);
	return server;
}

describe("authenticate", () => {
	it("accepts a valid bearer token", async () => {
		const server = await app();
		const token = server.jwt.sign({ id: "u1" });
		const res = await server.inject({ url: "/who", headers: { authorization: `Bearer ${token}` } });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ id: "u1" });
	});

	it.each([[undefined], ["Bearer nope"], ["Basic abc"]])("rejects %s with 401", async (header) => {
		const server = await app();
		const res = await server.inject({ url: "/who", headers: header ? { authorization: header } : {} });
		expect(res.statusCode).toBe(401);
		expect(res.json()).toMatchObject({ code: "unauthorized", error: "Unauthorized" });
	});

	it("rejects an expired token", async () => {
		const server = await app();
		const token = server.jwt.sign({ id: "u1" }, { expiresIn: "-1s" });
		expect((await server.inject({ url: "/who", headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(
			401,
		);
	});
});
