import type { FastifyInstance } from "fastify";
import { vi } from "vitest";
import { buildServer } from "@/server";
import { closeOrm, initOrm } from "#testdb";

export async function startApp(
	options: Parameters<typeof buildServer>[0] = { auth: { exchange: async () => "provider-token" } },
): Promise<FastifyInstance> {
	await initOrm();
	return buildServer(options);
}

export async function stopApp(app: FastifyInstance): Promise<void> {
	await app.close();
	await closeOrm();
	vi.unstubAllGlobals();
}

export const bearer = (app: FastifyInstance, id: string) => ({ authorization: `Bearer ${app.jwt.sign({ id })}` });

export const cookieOf = (setCookie: string | string[] | undefined) => String(setCookie).split(";")[0];

export const stubProvider = (routes: Record<string, unknown>) =>
	vi.stubGlobal("fetch", async (url: string) => ({ ok: routes[url] !== undefined, json: async () => routes[url] }));
