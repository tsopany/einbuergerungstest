import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { loggerOptions } from "@/plugins/redact";
import { buildServer } from "@/server";
import { closeOrm, initOrm, resetDatabase } from "#testdb";

const capture = () => {
	const lines: string[] = [];
	const stream = new Writable({
		write(chunk, _encoding, done) {
			lines.push(String(chunk));
			done();
		},
	});
	return { lines, stream };
};

async function withServer(run: (app: Awaited<ReturnType<typeof buildServer>>, lines: string[]) => Promise<void>) {
	const { lines, stream } = capture();
	await resetDatabase();
	await initOrm();
	const app = await buildServer({ logger: { ...loggerOptions(), stream } });
	try {
		await run(app, lines);
	} finally {
		await app.close();
		await closeOrm();
	}
}

describe("server log", () => {
	it("censors every token and secret field, at the top and one or two levels down", async () => {
		await withServer(async (app, lines) => {
			const secrets = {
				access_token: "S-access",
				refresh_token: "S-refresh",
				client_secret: "S-client",
				code: "S-code",
			};
			app.log.info({
				...secrets,
				one: {
					...secrets,
					accessToken: "S-a",
					refreshToken: "S-r",
				},
				two: {
					inner: {
						access_token: "S-deep-a",
						refresh_token: "S-deep-r",
						accessToken: "S-deep-a2",
						refreshToken: "S-deep-r2",
					},
				},
				keep: "visible",
			});
			const entry = JSON.parse(lines.find((line) => line.includes("visible"))!);
			const redacted = (value: unknown) => value === "[redacted]";
			expect(entry.keep).toBe("visible");
			expect(Object.keys(secrets).every((key) => redacted(entry[key]))).toBe(true);
			expect(Object.keys(secrets).every((key) => redacted(entry.one[key]))).toBe(true);
			for (const key of ["accessToken", "refreshToken"]) expect(redacted(entry.one[key])).toBe(true);
			for (const key of ["access_token", "refresh_token", "accessToken", "refreshToken"])
				expect(redacted(entry.two.inner[key])).toBe(true);
			expect(lines.join("")).not.toContain("S-");
		});
	});

	it("keeps the query string, where an oauth code travels, and the credential headers out of the request log", async () => {
		await withServer(async (app, lines) => {
			await app.inject({
				url: "/api/health?code=SECRET-CODE&state=SECRET-STATE",
				headers: { authorization: "Bearer SECRET-BEARER", cookie: "einbuergerungstest_refresh=SECRET-COOKIE" },
			});
			const written = lines.join("");
			expect(written).toContain("/api/health");
			for (const secret of ["SECRET-CODE", "SECRET-STATE", "SECRET-BEARER", "SECRET-COOKIE"])
				expect(written).not.toContain(secret);
		});
	});
});
