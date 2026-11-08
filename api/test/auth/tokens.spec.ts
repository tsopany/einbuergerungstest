import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { consumeRefreshToken, issueRefreshToken, revokeFamily } from "@/auth/tokens";
import { getEm } from "@/db/orm";
import { closeOrm, initOrm, resetDatabase, seedUser, withClient } from "#testdb";

describe("refresh tokens", () => {
	let userId: string;

	beforeAll(async () => {
		await resetDatabase();
		userId = await withClient((client) => seedUser(client, "owner"));
		await initOrm();
	});

	afterAll(closeOrm);

	it("stores only a hash and rotates on use within one family", async () => {
		const token = await issueRefreshToken(getEm(), userId);
		const stored = await getEm().getConnection().execute("select token_hash from refresh_tokens");
		expect(JSON.stringify(stored)).not.toContain(token);
		const first = await consumeRefreshToken(getEm(), token);
		expect(first).toMatchObject({ userId });
		const next = await issueRefreshToken(getEm(), userId, undefined, first!.familyId);
		expect(await consumeRefreshToken(getEm(), next)).toEqual(first);
	});

	it("revokes the whole family when a used token is presented again", async () => {
		const token = await issueRefreshToken(getEm(), userId);
		const consumed = await consumeRefreshToken(getEm(), token);
		const successor = await issueRefreshToken(getEm(), userId, undefined, consumed!.familyId);
		expect(await consumeRefreshToken(getEm(), token)).toBeNull();
		expect(await consumeRefreshToken(getEm(), successor)).toBeNull();
	});

	it("leaves other families alone when one is revoked", async () => {
		const mine = await issueRefreshToken(getEm(), userId);
		const other = await issueRefreshToken(getEm(), userId);
		const used = await issueRefreshToken(getEm(), userId);
		await consumeRefreshToken(getEm(), used);
		await consumeRefreshToken(getEm(), used);
		expect(await consumeRefreshToken(getEm(), other)).toMatchObject({ userId });
		expect(await consumeRefreshToken(getEm(), mine)).toMatchObject({ userId });
	});

	it("rejects unknown and expired tokens", async () => {
		expect(await consumeRefreshToken(getEm(), "nope")).toBeNull();
		const token = await issueRefreshToken(getEm(), userId, new Date("2020-01-01T00:00:00Z"));
		expect(await consumeRefreshToken(getEm(), token)).toBeNull();
	});

	it("revokes a family on logout", async () => {
		const token = await issueRefreshToken(getEm(), userId);
		const consumed = await consumeRefreshToken(getEm(), token);
		const successor = await issueRefreshToken(getEm(), userId, undefined, consumed!.familyId);
		await revokeFamily(getEm(), successor);
		expect(await consumeRefreshToken(getEm(), successor)).toBeNull();
	});

	it("prunes expired tokens when issuing", async () => {
		await issueRefreshToken(getEm(), userId, new Date("2020-01-01T00:00:00Z"));
		await issueRefreshToken(getEm(), userId);
		const rows = await getEm()
			.getConnection()
			.execute("select count(*)::int as n from refresh_tokens where expires_at < now()");
		expect(rows[0].n).toBe(0);
	});
});
