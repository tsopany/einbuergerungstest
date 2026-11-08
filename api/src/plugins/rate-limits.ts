import type { FastifyRequest } from "fastify";

export const GLOBAL_LIMIT = 200;
export const SIGN_UP_LIMIT = 30;

type Bucket = "sign-up";

const LIMITS: Record<Bucket | "default", number> = {
	"sign-up": SIGN_UP_LIMIT,
	default: GLOBAL_LIMIT,
};

const SIGN_UP = /^\/api\/auth\/google(\/callback)?$/;

export function bucketOf(request: Pick<FastifyRequest, "method" | "url">): Bucket | null {
	return SIGN_UP.test(request.url.split("?")[0]) ? "sign-up" : null;
}

export const maxFor = (request: FastifyRequest): number => LIMITS[bucketOf(request) ?? "default"];

export const keyFor = (request: FastifyRequest): string =>
	`${request.ip ?? "unknown"}:${bucketOf(request) ?? "default"}`;
