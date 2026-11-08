import "dotenv/config";
import { z } from "zod";

const optional = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());

const schema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().default(8115),
	FRONTEND_URL: z.string().url().default("http://localhost:3051"),
	DATABASE_URL: z.string().min(1),
	MIGRATION_LOCK_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
	JWT_SECRET: z
		.string()
		.min(32)
		.refine((value) => !/change-?me/i.test(value), "JWT_SECRET must not be a placeholder"),
	GOOGLE_CLIENT_ID: optional,
	GOOGLE_CLIENT_SECRET: optional,
	GOOGLE_CALLBACK_URL: optional,
	TRUSTED_PROXIES: optional,
	TRUSTED_HOSTS: optional,
	TRUSTED_ORIGINS: optional,
});

const parsed = schema.parse(process.env);

const list = (value: string | undefined): string[] =>
	(value ?? "")
		.split(",")
		.map((entry) => entry.trim().toLowerCase().replace(/\/$/, ""))
		.filter(Boolean);

function trustedHostsFor(): string[] {
	const hosts = list(parsed.TRUSTED_HOSTS);
	if (!hosts.length && parsed.NODE_ENV === "production") throw new Error("TRUSTED_HOSTS is required in production");
	return hosts;
}

export const config = {
	...parsed,
	TRUSTED_HOSTS: trustedHostsFor(),
	TRUSTED_ORIGINS: list(parsed.TRUSTED_ORIGINS),
	TRUSTED_PROXIES: parsed.TRUSTED_PROXIES?.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean),
};

export const databaseConnection = (() => {
	const url = new URL(config.DATABASE_URL);
	return {
		host: url.hostname,
		port: url.port ? Number(url.port) : 5432,
		user: decodeURIComponent(url.username),
		password: decodeURIComponent(url.password),
		dbName: url.pathname.replace(/^\//, ""),
		ssl: url.searchParams.get("sslmode") === "require",
	};
})();
