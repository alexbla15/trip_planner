import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip, formatTrip } from "@/models/Trip";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Replaces the entire expenses array for a trip. Owner or collaborator may call this. */
export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const { expenses } = await req.json() as {
      expenses?: Array<{ label: string; amount: number; attractionId?: string }>;
    };

    if (!Array.isArray(expenses)) {
      return NextResponse.json({ error: "expenses must be an array" }, { status: 400 });
    }

    for (const e of expenses) {
      if (!e.label?.trim()) {
        return NextResponse.json({ error: "Every expense must have a label" }, { status: 400 });
      }
      if (typeof e.amount !== "number" || e.amount < 0) {
        return NextResponse.json({ error: "Every expense amount must be a non-negative number" }, { status: 400 });
      }
    }

    const filter = {
      _id: id,
      $or: [
        { ownerId: payload.userId },
        { "collaborators.userId": payload.userId },
      ],
    };

    const updated = await Trip.findOneAndUpdate(
      filter,
      { $set: { expenses } },
      { new: true, runValidators: true }
    )
      .populate("ownerId", "name avatarUrl")
      .populate("collaborators.userId", "name email avatarUrl");

    if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(formatTrip(updated));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
