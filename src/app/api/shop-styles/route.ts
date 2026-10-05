import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { ShopStyle, formatShopStyle } from "@/models/ShopStyle";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

/** Public — returns all shop styles sorted alphabetically by name. */
export const GET = withApiHandler("GET /api/shop-styles", async () => {
  await dbConnect();
  const styles = await ShopStyle.find().sort({ name: 1 });
  return NextResponse.json(styles.map(formatShopStyle));
});

/** Admin only — creates a new shop style. */
export const POST = withApiHandler("POST /api/shop-styles", async (req: Request) => {
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as { name?: string; icon?: string };
  if (!body.name?.trim()) {
    throw badRequest("name is required");
  }
  if (!body.icon?.trim()) {
    throw badRequest("icon is required");
  }

  let created;
  try {
    created = await ShopStyle.create({ name: body.name.trim(), icon: body.icon.trim() });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A shop style with that name already exists");
    }
    throw serverError("Server error");
  }

  return NextResponse.json(formatShopStyle(created), { status: 201 });
});
