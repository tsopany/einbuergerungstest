import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "@/config";
import { errorBody } from "@/errors";
import { REFRESH_TTL_MS } from "@/auth/tokens";

const NAME = "einbuergerungstest_refresh";
const PATH = "/api/auth";
const HEADER = "x-requested-with";
const HEADER_VALUE = "einbuergerungstest";

export const secureAttribute = (): string => (config.NODE_ENV === "production" ? "; Secure" : "");

const attributes = (maxAgeSeconds: number) =>
	`Path=${PATH}; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secureAttribute()}`;

export function readCookie(header: string | undefined, wanted: string): string | undefined {
	for (const part of header?.split(";") ?? []) {
		const [name, ...value] = part.trim().split("=");
		if (name === wanted && value.length) return value.join("=") || undefined;
	}
	return undefined;
}

export const readRefreshCookie = (header: string | undefined): string | undefined => readCookie(header, NAME);

export const refreshCookie = (token: string) => `${NAME}=${token}; ${attributes(REFRESH_TTL_MS / 1000)}`;

export const clearedRefreshCookie = () => `${NAME}=; ${attributes(0)}`;

export function hasRefreshHeader(request: FastifyRequest, reply: FastifyReply): boolean {
	if (request.headers[HEADER] === HEADER_VALUE) return true;
	reply.status(403).send(errorBody(403, "missing_header", "Missing request header"));
	return false;
}
