import type { FastifyInstance } from "fastify";
import { AppError, ForbiddenError } from "@/errors";

export type GuardOptions = {
	requireHttps: boolean;
	trustedHosts: string[];
	trustedOrigins: string[];
};

export const GUARD_PROBE_PATH = "/api/health";

const hostOf = (host: string): string => {
	const lower = host.toLowerCase();
	return lower.startsWith("[") ? lower.slice(0, lower.indexOf("]") + 1) : lower.replace(/:\d+$/, "");
};

export function addRequestGuard(app: FastifyInstance, options: GuardOptions): void {
	app.addHook("onRequest", async (request) => {
		const path = request.url.split("?")[0];
		if (path === GUARD_PROBE_PATH) return;
		if (options.requireHttps && request.protocol !== "https")
			throw new AppError(400, "HTTPS is required", "https_required");
		if (options.trustedHosts.length && !options.trustedHosts.includes(hostOf(request.host)))
			throw new AppError(400, "Host not allowed", "host_not_allowed");
		const origin = request.headers.origin;
		if (origin && !options.trustedOrigins.includes(origin))
			throw new ForbiddenError("Origin not allowed", "origin_not_allowed");
	});
}
