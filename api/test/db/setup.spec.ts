import { afterAll, describe, expect, it } from "vitest";
import { closeOrm, getOrm } from "@/db/orm";
import { applyDatabaseSetup } from "@/db/setup";
import { migrationFiles } from "../_helpers/migrations";
import { withClient } from "#testdb";

describe("applyDatabaseSetup", () => {
	afterAll(closeOrm);

	it("migrates then connects the orm", async () => {
		await withClient((client) => client.query("drop schema public cascade; create schema public"));
		expect(await applyDatabaseSetup()).toEqual(migrationFiles());
		expect(getOrm()).toBeDefined();
		expect(await applyDatabaseSetup()).toEqual([]);
	});
});
