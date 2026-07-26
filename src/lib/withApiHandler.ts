import { NextResponse } from "next/server";
import { ApiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { applyCors } from "@/lib/cors";

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API route handler with consistent error handling, status codes, structured
 * logging, and CORS headers. Handlers should throw ApiError (src/lib/apiError.ts) — or
 * let it propagate from getUserFromRequest / a service function — instead of building
 * error NextResponses by hand. Unexpected (non-ApiError) throws are logged with full
 * detail and reduced to a generic 500 so internals never leak to the client.
 *
 * `routeName` is a short label (e.g. "GET /api/trips") used in log lines.
 */
export function withApiHandler<Ctx = unknown>(
  routeName: string,
  handler: RouteHandler<Ctx>
): RouteHandler<Ctx> {
  return async (req: Request, ctx: Ctx) => {
    try {
      const res = await handler(req, ctx);
      return applyCors(req, res);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status >= 500) {
          logger.error(routeName, { status: err.status, code: err.code, message: err.message });
        } else {
          logger.warn(routeName, { status: err.status, code: err.code, message: err.message });
        }
        return applyCors(
          req,
          NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
        );
      }

      logger.error(routeName, {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return applyCors(
        req,
        NextResponse.json(
          { error: "Internal server error", code: "INTERNAL_ERROR" },
          { status: 500 }
        )
      );
    }
  };
}
