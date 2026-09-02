import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { forbidden } from "@/lib/apiError";
import { User } from "@/models/User";
import { formatAdminMessage } from "@/models/AdminMessage";
import { listAdminMessages } from "@/lib/services/adminMessages.service";
import { dbConnect } from "@/lib/mongoose";

export const OPTIONS = corsPreflight;

/** Admin only — lists attraction-edit notifications, newest first. `?unread=1` filters to
 *  unread only (used for the navbar bell's badge count). */
export const GET = withApiHandler("GET /api/admin/messages", async (req: Request) => {
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  const messages = await listAdminMessages({ unreadOnly });
  return NextResponse.json(messages.map(formatAdminMessage));
});
