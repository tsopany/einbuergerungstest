import { describe, expect, it } from "vitest";
import { RefreshTokens } from "@/db/entities/refresh_tokens";

describe("RefreshTokens entity", () => {
	it("maps the refresh_tokens table columns", () => {
		expect(RefreshTokens.meta.tableName).toBe("refresh_tokens");
		expect(Object.keys(RefreshTokens.meta.properties)).toEqual(
			expect.arrayContaining(["token_hash", "user_id", "expires_at"]),
		);
	});
});
