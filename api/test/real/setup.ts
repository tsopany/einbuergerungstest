import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { afterAll } from "vitest";

const adminUrl = process.env.REAL_DATABASE_URL;
if (!adminUrl)
	throw new Error(
		"REAL_DATABASE_URL is required, e.g. postgresql://einbuergerungstest:<password>@localhost:5432/postgres (the role needs CREATEDB)",
	);

const name = `einbuergerungstest_real_${randomBytes(4).toString("hex")}`;
const withAdmin = async (sql: string) => {
	const admin = new Client({ connectionString: adminUrl });
	await admin.connect();
	try {
		await admin.query(sql);
	} finally {
		await admin.end();
	}
};

await withAdmin(`create database ${name}`);
const url = new URL(adminUrl);
url.pathname = `/${name}`;
process.env.DATABASE_URL = url.toString();

afterAll(() => withAdmin(`drop database if exists ${name} with (force)`));
