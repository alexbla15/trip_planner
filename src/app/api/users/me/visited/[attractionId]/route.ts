import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { markVisited, unmarkVisited } from "@/lib/services/visited.service";

interface RouteContext {
  params: Promise<{ attractionId: string }>;
}

export const OPTIONS = corsPreflight;

export const PUT = withApiHandler<RouteContext>("PUT /api/users/me/visited/[attractionId]", async (req, { params }) => {
  const { attractionId } = await params;
  const payload = getUserFromRequest(req);

  await markVisited(payload.userId, attractionId);
  return NextResponse.json({ isVisited: true });
});

export const DELETE = withApiHandler<RouteContext>("DELETE /api/users/me/visited/[attractionId]", async (req, { params }) => {
  const { attractionId } = await params;
  const payload = getUserFromRequest(req);

  await unmarkVisited(payload.userId, attractionId);
  return NextResponse.json({ isVisited: false });
});
