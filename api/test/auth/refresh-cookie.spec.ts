import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearedRefreshCookie,
	hasRefreshHeader,
	readCookie,
	readRefreshCookie,
	refreshCookie,
	secureAttribute,
} from "@/auth/refresh-cookie";

describe("refresh cookie", () => {
	it("is http-only, lax and scoped to the auth routes", () => {
		const cookie = refreshCookie("abc");
		expect(cookie).toContain("einbuergerungstest_refresh=abc");
		expect(cookie).toContain("Path=/api/auth");
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("SameSite=Lax");
		expect(cookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
	});

	it("clears with a zero max age", () => {
		expect(clearedRefreshCookie()).toContain("einbuergerungstest_refresh=;");
		expect(clearedRefreshCookie()).toContain("Max-Age=0");
	});

	it("reads the cookie among others", () => {
		expect(readRefreshCookie("a=1; einbuergerungstest_refresh=tok=en; b=2")).toBe("tok=en");
		expect(readRefreshCookie("einbuergerungstest_refresh=")).toBeUndefined();
		expect(readRefreshCookie("other=1")).toBeUndefined();
		expect(readRefreshCookie(undefined)).toBeUndefined();
	});

	it("requires the request header", () => {
		const send = vi.fn();
		const reply = { status: vi.fn(() => ({ send })) };
		expect(
			hasRefreshHeader({ headers: { "x-requested-with": "einbuergerungstest" } } as never, reply as never),
		).toBe(true);
		expect(hasRefreshHeader({ headers: {} } as never, reply as never)).toBe(false);
		expect(reply.status).toHaveBeenCalledWith(403);
	});
});

describe("readCookie", () => {
	it("finds a named cookie among others, keeps equals signs in the value and ignores empty values", () => {
		expect(readCookie("a=1; token=x==y; b=2", "token")).toBe("x==y");
		expect(readCookie("a=1", "token")).toBeUndefined();
		expect(readCookie("token=", "token")).toBeUndefined();
		expect(readCookie(undefined, "token")).toBeUndefined();
	});
});

describe("secure cookies", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("adds Secure in production", async () => {
		expect(secureAttribute()).toBe("");
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("TRUSTED_HOSTS", "test.tsopany.com");
		vi.resetModules();
		const refresh = await import("@/auth/refresh-cookie");
		expect(refresh.secureAttribute()).toBe("; Secure");
		expect(refresh.refreshCookie("abc")).toContain("; Secure");
	});
});
