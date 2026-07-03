import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Attraction, formatAttraction } from "@/models/Attraction";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const q = searchParams.get("q");
    const type = searchParams.get("type");

    if (!country?.trim()) {
      return NextResponse.json({ error: "country param is required" }, { status: 400 });
    }

    await dbConnect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { country };
    if (q?.trim()) {
      filter.name = { $regex: q.trim(), $options: "i" };
    }
    if (type?.trim()) {
      filter.types = type.trim();
    }

    const attractions = await Attraction.find(filter).sort({ name: 1 }).limit(20);
    return NextResponse.json(attractions.map((doc) => formatAttraction(doc, null)));
  } catch {
    return NextResponse.json({ error: "Failed to search attractions" }, { status: 500 });
  }
}
