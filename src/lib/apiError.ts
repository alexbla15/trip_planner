/**
 * Thrown by route handlers/services to signal a specific HTTP error. Caught by
 * withApiHandler (src/lib/withApiHandler.ts), which maps it to `{ error, code }` JSON
 * at the given status — keeping the existing `{ error: string }` response shape that
 * client code already parses (see src/services/http.ts's ApiError), while adding a
 * `code` for callers that want to branch on error type instead of message text.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new ApiError(400, message, code);

export const unauthorized = (message = "Unauthorized", code = "UNAUTHORIZED") =>
  new ApiError(401, message, code);

export const forbidden = (message = "Forbidden", code = "FORBIDDEN") =>
  new ApiError(403, message, code);

export const notFound = (message = "Not found", code = "NOT_FOUND") =>
  new ApiError(404, message, code);

export const conflict = (message: string, code = "CONFLICT") =>
  new ApiError(409, message, code);

export const serverError = (message = "Internal server error", code = "INTERNAL_ERROR") =>
  new ApiError(500, message, code);
