import type { FastifyRequest } from "fastify";

export const LOG_REDACT = [
	"access_token",
	"refresh_token",
	"client_secret",
	"code",
	"*.access_token",
	"*.refresh_token",
	"*.accessToken",
	"*.refreshToken",
	"*.client_secret",
	"*.code",
	"*.*.access_token",
	"*.*.refresh_token",
	"*.*.accessToken",
	"*.*.refreshToken",
];

export const loggerOptions = () => ({
	redact: { paths: LOG_REDACT, censor: "[redacted]" },
	serializers: {
		req: (request: FastifyRequest) => ({
			method: request.method,
			url: request.url.split("?")[0],
			host: request.host,
			remoteAddress: request.ip,
		}),
	},
});
