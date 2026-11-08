import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getEm } from "@/db/orm";
import { rawQuery } from "@/db/query";
import { closeOrm, initOrm, resetDatabase } from "#testdb";

describe("rawQuery", () => {
	beforeAll(async () => {
		await resetDatabase();
		await initOrm();
	});

	afterAll(closeOrm);

	it("returns rows", async () => {
		expect(await rawQuery(getEm(), "select ?::int as n", [3])).toEqual([{ n: 3 }]);
	});

	it("runs inside the entity manager's transaction and sees its uncommitted writes", async () => {
		const seen = await getEm().transactional(async (em) => {
			await em
				.getConnection()
				.execute("insert into users (email) values ('tx@example.com')", [], "run", em.getTransactionContext());
			return rawQuery<{ email: string }>(em, "select email from users where email = 'tx@example.com'");
		});
		expect(seen).toEqual([{ email: "tx@example.com" }]);
	});

	it("does not see writes of a rolled back transaction", async () => {
		await expect(
			getEm().transactional(async (em) => {
				await em
					.getConnection()
					.execute(
						"insert into users (email) values ('gone@example.com')",
						[],
						"run",
						em.getTransactionContext(),
					);
				throw new Error("rollback");
			}),
		).rejects.toThrow("rollback");
		expect(await rawQuery(getEm(), "select 1 from users where email = 'gone@example.com'")).toEqual([]);
	});
});
