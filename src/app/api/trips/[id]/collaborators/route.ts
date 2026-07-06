import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip, formatTrip } from "@/models/Trip";
import { User } from "@/models/User";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/trips/:id/collaborators — owner-only; body: { email: string } */
export async function POST(req: Request, { params }: RouteContext) {
  let payload: ReturnType<typeof getUserFromRequest>;
  try { payload = getUserFromRequest(req); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: tripId } = await params;
    await dbConnect();

    // Only the owner may manage collaborators
    const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const body = await req.json() as { email?: string };
    const email = body.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    // Cannot invite yourself
    if (email === payload.email) {
      return NextResponse.json({ error: "You cannot add yourself as a collaborator" }, { status: 400 });
    }

    const invitee = await User.findOne({ email });
    if (!invitee) {
      return NextResponse.json(
        { error: "No account found with that email. They need to sign up first." },
        { status: 404 }
      );
    }

    const alreadyAdded = trip.collaborators.some(
      (c) => c.userId.toString() === invitee._id.toString()
    );
    if (alreadyAdded) {
      return NextResponse.json({ error: "User is already a collaborator" }, { status: 409 });
    }

    const updated = await Trip.findOneAndUpdate(
      { _id: tripId, ownerId: payload.userId },
      { $push: { collaborators: { userId: invitee._id } } },
      { new: true }
    )
      .populate("ownerId", "name avatarUrl")
      .populate("collaborators.userId", "name email avatarUrl");

    if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(formatTrip(updated), { status: 201 });
  } catch (err) {
    console.error("[POST /api/trips/:id/collaborators]", err);
    return NextResponse.json({ error: "Failed to add collaborator" }, { status: 500 });
  }
}
