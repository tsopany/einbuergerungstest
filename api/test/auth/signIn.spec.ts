import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { completeSignIn, loginRedirect } from "@/auth/signIn";
import { Users } from "@/db/entities";
import { getEm } from "@/db/orm";
import { closeOrm, initOrm, resetDatabase } from "#testdb";

describe("loginRedirect", () => {
	it("goes to the login page, with the error when there is one", () => {
		expect(loginRedirect()).toBe("http://localhost:3051/p/login");
		expect(loginRedirect("oauth_failed")).toBe("http://localhost:3051/p/login?error=oauth_failed");
	});
});

describe("completeSignIn", () => {
	beforeAll(async () => {
		await resetDatabase();
		await initOrm();
	});

	afterAll(closeOrm);

	it("signs a new person in and hands back the refresh cookie", async () => {
		const { user, cookie } = await completeSignIn(getEm(), {
			provider: "google",
			externalId: "g-1",
			email: "New@Example.com",
		});
		expect(user.email).toBe("new@example.com");
		expect(cookie).toMatch(/^einbuergerungstest_refresh=.+; Path=\/api\/auth; Max-Age=\d+; HttpOnly; SameSite=Lax/);
		expect(await getEm().count(Users, { email: "new@example.com" })).toBe(1);
	});
});
