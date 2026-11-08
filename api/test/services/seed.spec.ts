import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getEm } from "@/db/orm";
import { seedFor } from "@/services/seed";
import { closeOrm, initOrm, resetDatabase, seedUser, withClient } from "#testdb";

describe("seed service", () => {
	let userId: string;
	let otherId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "seed"));
		otherId = await withClient((client) => seedUser(client, "seed2"));
		await initOrm();
	});

	afterAll(closeOrm);

	it("makes a seed once, keeps it, and gives each user their own", async () => {
		const seed = await seedFor(getEm(), userId);
		expect(Number.isInteger(seed)).toBe(true);
		expect(seed).toBeGreaterThanOrEqual(0);
		expect(seed).toBeLessThan(2 ** 31);
		expect(await seedFor(getEm(), userId)).toBe(seed);
		expect(await seedFor(getEm(), otherId)).not.toBe(seed);
	});

	it("reads the seed that another request stored first when both race", async () => {
		const racer = await withClient((client) => seedUser(client, "racer"));
		const em = getEm();
		const real = em.insert.bind(em);
		vi.spyOn(em, "insert").mockImplementationOnce((async (...args: Parameters<typeof real>) => {
			await real(...args);
			throw new UniqueConstraintViolationException(new Error("duplicate"));
		}) as never);
		const seed = await seedFor(em, racer);
		expect(await seedFor(getEm(), racer)).toBe(seed);
	});

	it("does not hide other failures", async () => {
		const em = getEm();
		vi.spyOn(em, "insert").mockRejectedValueOnce(new Error("database down"));
		const fresh = await withClient((client) => seedUser(client, "broken"));
		await expect(seedFor(em, fresh)).rejects.toThrow("database down");
	});
});
