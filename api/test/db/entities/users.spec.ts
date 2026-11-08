import { describe, expect, it } from "vitest";
import { Users } from "@/db/entities/users";

describe("Users entity", () => {
	it("maps the users table columns", () => {
		expect(Users.meta.tableName).toBe("users");
		expect(Object.keys(Users.meta.properties)).toEqual(
			expect.arrayContaining(["id", "email", "created_at", "updated_at"]),
		);
	});
});
