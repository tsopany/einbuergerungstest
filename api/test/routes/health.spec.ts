import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "@/server";

describe("health route", () => {
	let app: Awaited<ReturnType<typeof buildServer>>;

	beforeAll(async () => {
		app = await buildServer();
	});

	afterAll(() => app.close());

	it("answers under /api only", async () => {
		expect((await app.inject({ url: "/api/health" })).json()).toEqual({ status: "ok" });
		expect((await app.inject({ url: "/health" })).statusCode).toBe(404);
	});
});
