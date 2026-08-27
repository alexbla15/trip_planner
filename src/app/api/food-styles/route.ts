import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { FoodStyle, formatFoodStyle } from "@/models/FoodStyle";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

/** Public — returns all food styles sorted alphabetically by name. */
export const GET = withApiHandler("GET /api/food-styles", async () => {
  await dbConnect();
  const styles = await FoodStyle.find().sort({ name: 1 });
  return NextResponse.json(styles.map(formatFoodStyle));
});

/** Admin only — creates a new food style. */
export const POST = withApiHandler("POST /api/food-styles", async (req: Request) => {
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as { name?: string };
  if (!body.name?.trim()) {
    throw badRequest("name is required");
  }

  let created;
  try {
    created = await FoodStyle.create({ name: body.name.trim() });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A food style with that name already exists");
    }
    throw serverError("Server error");
  }

  return NextResponse.json(formatFoodStyle(created), { status: 201 });
});
