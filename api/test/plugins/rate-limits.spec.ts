import { describe, expect, it } from "vitest";
import { bucketOf, GLOBAL_LIMIT, keyFor, maxFor, SIGN_UP_LIMIT } from "@/plugins/rate-limits";

const ADDRESS = ["1", "2", "3", "4"].join(".");
const request = (method: string, url: string) => ({ method, url, ip: ADDRESS }) as never;

describe("rate limit buckets", () => {
	it.each([
		["GET", "/api/auth/google", "sign-up"],
		["GET", "/api/auth/google/callback?code=x", "sign-up"],
		["POST", "/api/auth/refresh", null],
		["GET", "/api/auth/google/extra", null],
		["GET", "/api/auth/unknown", null],
		["GET", "/api/me", null],
	])("puts %s %s in %s", (method, url, bucket) => {
		expect(bucketOf({ method, url } as never)).toBe(bucket);
	});

	it("keeps the numbers in this file", () => {
		expect([SIGN_UP_LIMIT, GLOBAL_LIMIT]).toEqual([30, 200]);
	});

	it("limits and keys per client address and bucket", () => {
		expect(maxFor(request("GET", "/api/auth/google"))).toBe(SIGN_UP_LIMIT);
		expect(maxFor(request("GET", "/api/me"))).toBe(GLOBAL_LIMIT);
		expect(keyFor(request("GET", "/api/auth/google"))).toBe(`${ADDRESS}:sign-up`);
		expect(keyFor(request("GET", "/api/me"))).toBe(`${ADDRESS}:default`);
		expect(keyFor({ method: "GET", url: "/api/me" } as never)).toBe("unknown:default");
	});
});
