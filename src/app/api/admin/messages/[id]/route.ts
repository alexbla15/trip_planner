import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden } from "@/lib/apiError";
import { User } from "@/models/User";
import { formatAdminMessage } from "@/models/AdminMessage";
import { setAdminMessageRead } from "@/lib/services/adminMessages.service";
import { dbConnect } from "@/lib/mongoose";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

/** Admin only — toggles a message's read/unread flag. Body: `{ read: boolean }`. */
export const PATCH = withApiHandler<RouteContext>("PATCH /api/admin/messages/[id]", async (req, { params }) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as { read?: boolean };
  if (typeof body.read !== "boolean") {
    throw badRequest("`read` (boolean) is required");
  }

  const message = await setAdminMessageRead(id, body.read);
  return NextResponse.json(formatAdminMessage(message));
});
