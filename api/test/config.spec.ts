import { afterEach, describe, expect, it, vi } from "vitest";
import { config } from "../src/config";

describe("config", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("should parse defaults", () => {
		expect(config.PORT).toBeTypeOf("number");
		expect(config.FRONTEND_URL).toMatch(/^http/);
	});

	it("derives the database connection from the url", async () => {
		vi.stubEnv(
			"DATABASE_URL",
			"postgresql://einbuergerungstest:p%40ss@db.example:6543/einbuergerungstest?sslmode=require",
		);
		const { databaseConnection } = await import("../src/config");
		expect(databaseConnection).toEqual({
			host: "db.example",
			port: 6543,
			user: "einbuergerungstest",
			password: "p@ss",
			dbName: "einbuergerungstest",
			ssl: true,
		});
	});

	it.each(["short", "change-me-to-a-random-string-of-32-chars-or-more", "CHANGEME-CHANGEME-CHANGEME-CHANGEME-1"])(
		"refuses the JWT secret %j",
		async (secret) => {
			vi.stubEnv("JWT_SECRET", secret);
			await expect(import("../src/config")).rejects.toThrow();
		},
	);

	it("reads the trusted proxies as a list and leaves it unset by default", async () => {
		expect(config.TRUSTED_PROXIES).toBeUndefined();
		vi.stubEnv("TRUSTED_PROXIES", " loopback , uniquelocal,,");
		const { config: proxied } = await import("../src/config");
		expect(proxied.TRUSTED_PROXIES).toEqual(["loopback", "uniquelocal"]);
	});

	it("reads the trusted hosts and origins as lowercase lists, and insists on hosts in production", async () => {
		expect(config.TRUSTED_HOSTS).toEqual([]);
		expect(config.TRUSTED_ORIGINS).toEqual([]);
		vi.stubEnv("TRUSTED_HOSTS", " Test.Tsopany.com , www.test.tsopany.com,,");
		vi.stubEnv("TRUSTED_ORIGINS", "https://a.test/, HTTPS://B.test");
		const { config: listed } = await import("../src/config");
		expect(listed.TRUSTED_HOSTS).toEqual(["test.tsopany.com", "www.test.tsopany.com"]);
		expect(listed.TRUSTED_ORIGINS).toEqual(["https://a.test", "https://b.test"]);
		vi.resetModules();
		vi.stubEnv("TRUSTED_HOSTS", "");
		vi.stubEnv("NODE_ENV", "production");
		await expect(import("../src/config")).rejects.toThrow("TRUSTED_HOSTS is required in production");
	});
});
