import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase, seedUser, withClient } from "#testdb";

describe("baseline schema", () => {
	beforeAll(resetDatabase);

	it("allows only Google identities, once per external id", async () => {
		const user = await withClient((client) => seedUser(client, "identity"));
		const insert = (provider: string, externalId: string) =>
			withClient((client) =>
				client.query(
					"insert into identities (user_id, provider, external_id, email) values ($1, $2, $3, 'a@example.com')",
					[user, provider, externalId],
				),
			);
		await expect(insert("github", "1")).rejects.toThrow(/check/);
		await insert("google", "1");
		await expect(insert("google", "1")).rejects.toThrow(/unique/);
	});

	it("removes identities and refresh tokens with their user", async () => {
		const user = await withClient((client) => seedUser(client, "cascade"));
		await withClient(async (client) => {
			await client.query(
				"insert into identities (user_id, provider, external_id, email) values ($1, 'google', 'cascade', 'c@example.com')",
				[user],
			);
			await client.query(
				"insert into refresh_tokens (token_hash, user_id, expires_at) values ('h', $1, now() + interval '1 day')",
				[user],
			);
			await client.query("delete from users where id = $1", [user]);
			expect((await client.query("select 1 from identities where user_id = $1", [user])).rows).toEqual([]);
			expect((await client.query("select 1 from refresh_tokens where user_id = $1", [user])).rows).toEqual([]);
		});
	});

	it("bumps updated_at on update", async () => {
		const id = await withClient((client) => seedUser(client, "touch"));
		const read = () =>
			withClient(async (client) => {
				const { rows } = await client.query("select updated_at from users where id = $1", [id]);
				return new Date(rows[0].updated_at).getTime();
			});
		const before = await read();
		await new Promise((resolve) => setTimeout(resolve, 10));
		await withClient((client) =>
			client.query("update users set email = 'touched@example.com' where id = $1", [id]),
		);
		expect(await read()).toBeGreaterThan(before);
	});

	it("keeps exam answers and exams consistent", async () => {
		const user = await withClient((client) => seedUser(client, "consistency"));
		const run = (sql: string, params: unknown[] = []) => withClient((client) => client.query(sql, params));
		const answer = (source: string, examId: number | null, chosen = 0) =>
			run(
				"insert into answers (user_id, question_id, chosen, correct, source, exam_id) values ($1, '1', $2, false, $3, $4)",
				[user, chosen, source, examId],
			);
		await expect(answer("practice", null, 4)).rejects.toThrow(/check/);
		await expect(answer("other", null)).rejects.toThrow(/check/);
		await expect(answer("exam", null)).rejects.toThrow(/check/);
		const { rows } = await run(
			"insert into exams (user_id) returning id".replace("(user_id)", "(user_id) values ($1)"),
			[user],
		);
		await expect(answer("practice", rows[0].id)).rejects.toThrow(/check/);
		await answer("exam", rows[0].id);
		await expect(run("update exams set finished_at = now() where id = $1", [rows[0].id])).rejects.toThrow(/check/);
		await expect(
			run("update exams set finished_at = now(), score = 34, passed = true where id = $1", [rows[0].id]),
		).rejects.toThrow(/check/);
		await run("update exams set finished_at = now(), score = 20, passed = true where id = $1", [rows[0].id]);
		await run("delete from exams where id = $1", [rows[0].id]);
		expect((await run("select 1 from answers where user_id = $1 and exam_id is not null", [user])).rows).toEqual(
			[],
		);
	});
});
