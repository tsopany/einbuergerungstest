import { STATUS_CODES } from "node:http";

export class AppError extends Error {
	readonly statusCode: number;
	readonly code: string;

	constructor(statusCode: number, message: string, code: string) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
}

export class NotFoundError extends AppError {
	constructor(message = "Not found", code = "not_found") {
		super(404, message, code);
	}
}

export class ForbiddenError extends AppError {
	constructor(message = "Forbidden", code = "forbidden") {
		super(403, message, code);
	}
}

export class ConflictError extends AppError {
	constructor(message = "Conflict", code = "conflict") {
		super(409, message, code);
	}
}

export const errorBody = (statusCode: number, code: string, message: string, extra: Record<string, unknown> = {}) => ({
	statusCode,
	error: STATUS_CODES[statusCode] ?? "Error",
	code,
	message,
	...extra,
});

export class TooManyRequestsError extends AppError {
	constructor(message = "Too many requests", code = "too_many_requests") {
		super(429, message, code);
	}
}
