import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Answers, Identities, Users } from "@/db/entities";
import { getEm } from "@/db/orm";
import { deleteUser, findUser, signIn, toProfile } from "@/services/users";
import { closeOrm, initOrm, resetDatabase } from "#testdb";

describe("users service", () => {
	beforeAll(async () => {
		await resetDatabase();
		await initOrm();
	});

	afterAll(closeOrm);

	it("creates a user and identity on first sign-in and lowercases the email", async () => {
		const user = await signIn(getEm(), { provider: "google", externalId: "g-1", email: " Me@Example.com " });
		expect(user.email).toBe("me@example.com");
		expect(await getEm().count(Identities, { user_id: user.id })).toBe(1);
	});

	it("matches by provider identity and follows an email change", async () => {
		const first = await signIn(getEm(), { provider: "google", externalId: "g-2", email: "old@example.com" });
		const again = await signIn(getEm(), { provider: "google", externalId: "g-2", email: "new@example.com" });
		expect(again.id).toBe(first.id);
		expect((await getEm().findOneOrFail(Identities, { user_id: first.id })).email).toBe("new@example.com");
		expect(await getEm().count(Users, { id: first.id })).toBe(1);
	});

	it("reuses the user that already has the same verified email", async () => {
		const first = await signIn(getEm(), { provider: "google", externalId: "g-3", email: "same@example.com" });
		const other = await signIn(getEm(), { provider: "google", externalId: "g-4", email: "same@example.com" });
		expect(other.id).toBe(first.id);
		expect(await getEm().count(Identities, { user_id: first.id })).toBe(2);
	});

	it("stores the name and refreshes it on the next sign-in", async () => {
		const first = await signIn(getEm(), {
			provider: "google",
			externalId: "g-n",
			email: "n@example.com",
			name: " Ada ",
		});
		expect(first.name).toBe("Ada");
		const again = await signIn(getEm(), {
			provider: "google",
			externalId: "g-n",
			email: "n@example.com",
			name: "Ada L.",
		});
		expect(again.name).toBe("Ada L.");
		const kept = await signIn(getEm(), { provider: "google", externalId: "g-n", email: "n@example.com" });
		expect(kept.name).toBe("Ada L.");
		expect(toProfile(kept)).toEqual({ id: kept.id, email: "n@example.com", name: "Ada L." });
	});

	it("finds users by id and shapes the profile", async () => {
		const user = await signIn(getEm(), { provider: "google", externalId: "g-5", email: "find@example.com" });
		expect(await findUser(getEm(), user.id)).toMatchObject({ id: user.id });
		expect(await findUser(getEm(), "00000000-0000-0000-0000-000000000000")).toBeNull();
		expect(toProfile(user)).toEqual({ id: user.id, email: "find@example.com", name: null });
	});

	it("retries once when two sign-ins of the same person race on the unique identity", async () => {
		const em = getEm();
		const real = em.transactional.bind(em);
		let calls = 0;
		vi.spyOn(em, "transactional").mockImplementation(((run: never) => {
			calls += 1;
			if (calls === 1) throw new UniqueConstraintViolationException(new Error("duplicate"));
			return real(run);
		}) as never);
		const user = await signIn(em, { provider: "google", externalId: "g-6", email: "race@example.com" });
		expect(user.email).toBe("race@example.com");
		expect(calls).toBe(2);
	});

	it("does not hide other failures", async () => {
		const em = getEm();
		vi.spyOn(em, "transactional").mockRejectedValue(new Error("database down"));
		await expect(signIn(em, { provider: "google", externalId: "g-7", email: "down@example.com" })).rejects.toThrow(
			"database down",
		);
	});

	it("deletes a user together with identities and answers", async () => {
		const user = await signIn(getEm(), { provider: "google", externalId: "g-8", email: "bye@example.com" });
		await getEm().insert(Answers, {
			user_id: user.id,
			question_id: "1",
			chosen: 0,
			correct: false,
			source: "practice",
		});
		expect(await deleteUser(getEm(), user.id)).toBe(1);
		expect(await getEm().count(Users, { id: user.id })).toBe(0);
		expect(await getEm().count(Identities, { user_id: user.id })).toBe(0);
		expect(await getEm().count(Answers, { user_id: user.id })).toBe(0);
	});
});
