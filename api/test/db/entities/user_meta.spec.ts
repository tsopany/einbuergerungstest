import { describe, expect, it } from "vitest";
import { UserMeta } from "@/db/entities/user_meta";

describe("UserMeta entity", () => {
	it("maps the user_meta table columns", () => {
		expect(UserMeta.meta.tableName).toBe("user_meta");
		expect(Object.keys(UserMeta.meta.properties)).toEqual(expect.arrayContaining(["user_id", "key", "value"]));
	});
});
