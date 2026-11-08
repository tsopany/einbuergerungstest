import { describe, expect, it } from "vitest";
import { resetDatabase } from "@/db/reset";
import { migrationFiles } from "../_helpers/migrations";
import { seedUser, withClient } from "#testdb";

describe("resetDatabase", () => {
	it("drops data and reapplies migrations", async () => {
		await resetDatabase();
		await withClient((client) => seedUser(client, "abcd"));
		expect(await resetDatabase()).toEqual(migrationFiles());
		const count = await withClient(
			async (client) => (await client.query("select count(*)::int as n from users")).rows[0].n,
		);
		expect(count).toBe(0);
	});
});
