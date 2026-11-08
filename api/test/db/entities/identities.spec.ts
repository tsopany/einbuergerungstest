import { describe, expect, it } from "vitest";
import { Identities } from "@/db/entities/identities";

describe("Identities entity", () => {
	it("maps the identities table columns", () => {
		expect(Identities.meta.tableName).toBe("identities");
		expect(Object.keys(Identities.meta.properties)).toEqual(
			expect.arrayContaining(["user_id", "provider", "external_id", "email"]),
		);
	});
});
