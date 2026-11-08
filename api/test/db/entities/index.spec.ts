import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { allEntities } from "@/db/entities";
import { closeOrm, resetDatabase, withClient } from "#testdb";

describe("entity registry", () => {
	beforeAll(resetDatabase);

	afterAll(closeOrm);

	it("registers every table once", () => {
		const names = allEntities.map((entity) => entity.meta.tableName).sort();
		expect(names).toEqual(["answers", "exams", "identities", "refresh_tokens", "user_meta", "users"]);
	});

	it("maps exactly the columns of the migrated tables", async () => {
		for (const entity of allEntities) {
			const table = entity.meta.tableName;
			const columns = await withClient(
				async (client) =>
					(
						await client.query("select column_name from information_schema.columns where table_name = $1", [
							table,
						])
					).rows,
			);
			expect(Object.keys(entity.meta.properties).sort(), table).toEqual(
				columns.map((row) => row.column_name).sort(),
			);
		}
	});
});
