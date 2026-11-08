import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOrm, getEm, getOrm, useOrm } from "@/db/orm";

describe("orm", () => {
	afterEach(() => useOrm(null));

	it("throws before initialization", () => {
		expect(() => getOrm()).toThrow("MikroORM is not initialized");
		expect(() => getEm()).toThrow("MikroORM is not initialized");
	});

	it("closeOrm is a no-op before initialization", async () => {
		await expect(closeOrm()).resolves.toBeUndefined();
	});

	it("uses an injected orm and forks entity managers from it", () => {
		const fork = () => ({ forked: true });
		const orm = { em: { fork } };
		useOrm(orm as never);
		expect(getOrm()).toBe(orm);
		expect(getEm()).toEqual({ forked: true });
		expect(getEm()).not.toBe(getEm());
		useOrm(null);
		expect(() => getOrm()).toThrow("MikroORM is not initialized");
	});
});

describe("orm initialization", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.doUnmock("@mikro-orm/postgresql");
		vi.resetModules();
	});

	async function load(url?: string) {
		const close = vi.fn(async () => undefined);
		const init = vi.fn(async (_options: unknown) => ({ em: { fork: () => ({}) }, close }));
		vi.doMock("@mikro-orm/postgresql", async (original) => ({
			...(await original<object>()),
			MikroORM: { init },
		}));
		if (url) vi.stubEnv("DATABASE_URL", url);
		vi.resetModules();
		return { orm: await import("@/db/orm"), init, close };
	}

	it("connects once for concurrent callers and closes the instance", async () => {
		const { orm, init, close } = await load();
		const [first, second] = await Promise.all([orm.initOrm(), orm.initOrm()]);
		expect(first).toBe(second);
		expect(await orm.initOrm()).toBe(first);
		expect(init).toHaveBeenCalledTimes(1);
		expect(init.mock.calls[0][0]).toMatchObject({ dbName: expect.any(String), forceUtcTimezone: true });
		expect(init.mock.calls[0][0]).not.toHaveProperty("driverOptions.connection");
		await orm.closeOrm();
		expect(close).toHaveBeenCalledTimes(1);
		expect(() => orm.getOrm()).toThrow("MikroORM is not initialized");
	});

	it("asks for ssl when the url requires it", async () => {
		const { orm, init } = await load("postgresql://u:p@db.example:5432/app?sslmode=require");
		await orm.initOrm();
		expect(init.mock.calls[0][0]).toMatchObject({
			driverOptions: { connection: { ssl: { rejectUnauthorized: false } } },
		});
	});
});
