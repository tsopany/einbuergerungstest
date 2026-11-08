import { describe, expect, it } from "vitest";
import { AppError, ConflictError, errorBody, ForbiddenError, NotFoundError } from "@/errors";

describe("errors", () => {
	it.each([
		[new NotFoundError(), 404, "Not found", "not_found"],
		[new ForbiddenError(), 403, "Forbidden", "forbidden"],
		[new ConflictError(), 409, "Conflict", "conflict"],
		[new NotFoundError("gone", "task_gone"), 404, "gone", "task_gone"],
		[new ConflictError("taken", "username_taken"), 409, "taken", "username_taken"],
		[new ForbiddenError("no", "read_only"), 403, "no", "read_only"],
	])("carries status, message and code", (error, statusCode, message, code) => {
		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(Error);
		expect(error.statusCode).toBe(statusCode);
		expect(error.message).toBe(message);
		expect(error.code).toBe(code);
	});
});

describe("errorBody", () => {
	it("has one shape for every error", () => {
		expect(errorBody(404, "not_found", "Task not found")).toEqual({
			statusCode: 404,
			error: "Not Found",
			code: "not_found",
			message: "Task not found",
		});
		expect(errorBody(400, "validation_error", "Invalid input", { issues: [1] })).toMatchObject({ issues: [1] });
		expect(errorBody(499, "odd", "x").error).toBe("Error");
	});
});
