import { describe, expect, it } from "vitest";
import { googleProfile } from "@/auth/profiles";

const answer = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe("googleProfile", () => {
	it("maps a verified Google account", async () => {
		const seen: unknown[] = [];
		const fetcher = (async (url: string, init: RequestInit) => {
			seen.push(url, init.headers);
			return {
				ok: true,
				json: async () => ({ id: 42, email: "me@example.com", verified_email: true, name: "Me Example" }),
			};
		}) as unknown as typeof fetch;
		expect(await googleProfile("token", fetcher)).toEqual({
			provider: "google",
			externalId: "42",
			email: "me@example.com",
			name: "Me Example",
		});
		expect(seen).toEqual(["https://www.googleapis.com/oauth2/v2/userinfo", { Authorization: "Bearer token" }]);
	});

	it.each([
		[{ id: "1", email: "me@example.com", verified_email: false }],
		[{ id: "1", email: "me@example.com" }],
		[{ email: "me@example.com", verified_email: true }],
		[{ id: "1", verified_email: true }],
	])("rejects %j", async (body) => {
		expect(await googleProfile("token", answer(body))).toBeNull();
	});

	it("rejects a failed or broken request", async () => {
		expect(await googleProfile("token", answer({}, false))).toBeNull();
		const broken = (async () => {
			throw new Error("offline");
		}) as unknown as typeof fetch;
		expect(await googleProfile("token", broken)).toBeNull();
	});
});
