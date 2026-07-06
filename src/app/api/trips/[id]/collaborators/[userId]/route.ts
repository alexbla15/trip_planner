import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip, formatTrip } from "@/models/Trip";

interface RouteContext {
  params: Promise<{ id: string; userId: string }>;
}

/** DELETE /api/trips/:id/collaborators/:userId — owner-only; removes the collaborator */
export async function DELETE(req: Request, { params }: RouteContext) {
  let payload: ReturnType<typeof getUserFromRequest>;
  try { payload = getUserFromRequest(req); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: tripId, userId: targetUserId } = await params;
    await dbConnect();

    // Verify the trip exists and the caller is the owner, and the collaborator is present
    const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const exists = trip.collaborators.some((c) => c.userId.toString() === targetUserId);
    if (!exists) return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });

    const updated = await Trip.findOneAndUpdate(
      { _id: tripId, ownerId: payload.userId },
      { $pull: { collaborators: { userId: targetUserId } } },
      { new: true }
    )
      .populate("ownerId", "name avatarUrl")
      .populate("collaborators.userId", "name email avatarUrl");

    if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(formatTrip(updated));
  } catch (err) {
    console.error("[DELETE /api/trips/:id/collaborators/:userId]", err);
    return NextResponse.json({ error: "Failed to remove collaborator" }, { status: 500 });
  }
}
