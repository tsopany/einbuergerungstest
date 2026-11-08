import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { config } from "@/config";
import { applyDatabaseSetup } from "@/db/setup";
import { AppError, errorBody, TooManyRequestsError } from "@/errors";
import { keyFor, maxFor } from "@/plugins/rate-limits";
import { loggerOptions } from "@/plugins/redact";
import { addRequestGuard } from "@/plugins/request-guard";
import { addSecurityHeaders } from "@/plugins/security-headers";
import answerRoutes from "@/routes/answers";
import authRoutes, { type AuthOptions } from "@/routes/auth";
import examRoutes from "@/routes/exams";
import healthRoutes from "@/routes/health";
import meRoutes from "@/routes/me";
import progressRoutes from "@/routes/progress";
import seedRoutes from "@/routes/seed";

async function buildServer(
	options: {
		auth?: AuthOptions;
		logger?: ReturnType<typeof loggerOptions> & { stream?: NodeJS.WritableStream };
	} = {},
): Promise<FastifyInstance> {
	const app = fastify({
		logger: options.logger ?? (config.NODE_ENV === "test" ? false : loggerOptions()),
		trustProxy: config.TRUSTED_PROXIES ?? false,
	});
	await app.register(cors, { origin: new URL(config.FRONTEND_URL).origin, credentials: true });
	addRequestGuard(app, {
		requireHttps: config.NODE_ENV === "production",
		trustedHosts: config.TRUSTED_HOSTS,
		trustedOrigins: [new URL(config.FRONTEND_URL).origin, ...config.TRUSTED_ORIGINS],
	});
	await app.register(rateLimit, {
		global: true,
		max: maxFor,
		timeWindow: "1 minute",
		keyGenerator: keyFor,
		errorResponseBuilder: () => new TooManyRequestsError(),
	});
	addSecurityHeaders(app);
	await app.register(jwt, { secret: config.JWT_SECRET });
	app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
		if (error instanceof ZodError)
			return reply
				.status(400)
				.send(errorBody(400, "validation_error", "Invalid input", { issues: error.issues }));
		if (error instanceof AppError)
			return reply.status(error.statusCode).send(errorBody(error.statusCode, error.code, error.message));
		request.log.error(error);
		const status = error.statusCode ?? 500;
		return reply
			.status(status)
			.send(
				errorBody(
					status,
					status < 500 ? "bad_request" : "internal_error",
					status < 500 ? error.message : "Internal Server Error",
				),
			);
	});
	await app.register(
		async (api) => {
			await api.register(healthRoutes);
			await api.register(authRoutes, options.auth ?? {});
			await api.register(meRoutes);
			await api.register(answerRoutes);
			await api.register(examRoutes);
			await api.register(seedRoutes);
			await api.register(progressRoutes);
		},
		{ prefix: "/api" },
	);
	return app;
}

/* v8 ignore start -- process bootstrap, exercised by the deployed container */
async function start(): Promise<void> {
	await applyDatabaseSetup();
	const app = await buildServer();
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.once(signal, () => {
			void app.close().then(() => process.exit(0));
		});
	}
	try {
		await app.listen({ port: config.PORT, host: "0.0.0.0" });
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await start();
}
/* v8 ignore stop */

export { buildServer, start };
