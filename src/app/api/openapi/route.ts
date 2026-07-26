import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

/** Serves the repo-root swagger.yaml so /api-docs (src/app/api-docs/page.tsx) can render
 *  it live without duplicating the spec into public/. */
export const GET = withApiHandler("GET /api/openapi", async () => {
  let yaml: string;
  try {
    yaml = await readFile(path.join(process.cwd(), "swagger.yaml"), "utf-8");
  } catch {
    throw serverError("OpenAPI spec is unavailable");
  }
  return new NextResponse(yaml, {
    headers: { "Content-Type": "application/yaml; charset=utf-8" },
  });
});
