import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bearer, startApp, stopApp } from "../_helpers/server";
import { resetDatabase, seedUser, withClient } from "#testdb";

describe("seed route", () => {
	let app: FastifyInstance;
	let userId: string;
	let otherId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "seeded"));
		otherId = await withClient((client) => seedUser(client, "other"));
		app = await startApp();
	});

	afterAll(() => stopApp(app));

	it("needs a token", async () => {
		expect((await app.inject({ url: "/api/seed" })).statusCode).toBe(401);
	});

	it("gives the same seed every time, and another one to another user", async () => {
		const get = async (id: string) =>
			(await app.inject({ url: "/api/seed", headers: bearer(app, id) })).json().seed as number;
		const first = await get(userId);
		expect(Number.isInteger(first)).toBe(true);
		expect(await get(userId)).toBe(first);
		expect(await get(otherId)).not.toBe(first);
	});
});
