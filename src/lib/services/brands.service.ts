import { dbConnect } from "@/lib/mongoose";
import { badRequest } from "@/lib/apiError";
import { Brand, type IBrand } from "@/models/Brand";

export interface ResolvedBrand {
  name: string;
  photoUrl?: string;
  websiteUrl?: string;
  typeNames?: string[];
}

function toResolvedBrand(doc: IBrand): ResolvedBrand {
  const typeNames = (doc.types as unknown[])
    .filter((t) => t && typeof t === "object" && "name" in (t as Record<string, unknown>))
    .map((t) => (t as { name: string }).name);
  return { name: doc.name, photoUrl: doc.photoUrl, websiteUrl: doc.websiteUrl, typeNames };
}

/** Maps each brand id (string) to its resolved fallback fields — for resolving a list of
 *  attractions' brand defaults in one query, mirroring getParentNameMap/getParentPhotoMap
 *  in `nestedAttractions.service.ts`. Brands that no longer exist (a dangling, deleted ref)
 *  are simply absent from the map — `formatAttraction` then has no fallback to apply,
 *  same as an attraction with no brandId at all. */
export async function getBrandMap(brandIds: (string | null | undefined)[]): Promise<Map<string, ResolvedBrand>> {
  const map = new Map<string, ResolvedBrand>();
  const uniqueIds = [...new Set(brandIds.filter((id): id is string => !!id))];
  if (uniqueIds.length === 0) return map;
  await dbConnect();
  const brands = await Brand.find({ _id: { $in: uniqueIds } }).populate("types", "name");
  for (const b of brands) map.set(b._id.toString(), toResolvedBrand(b));
  return map;
}

/** Resolved fallback fields for a single attraction's brand — cheaper than `getBrandMap`
 *  when only one doc's brand needs resolving (e.g. after a POST/PUT). Returns undefined
 *  when `brandId` is null/undefined or the brand doc is missing. */
export async function getBrand(brandId: string | null | undefined): Promise<ResolvedBrand | undefined> {
  if (!brandId) return undefined;
  const map = await getBrandMap([brandId]);
  return map.get(brandId);
}

/** Validates a would-be brand link for create/update — throws a 400 if the brand doesn't
 *  exist. Unlike `resolveParentLink`, there's no cycle/same-country check to make: a brand
 *  isn't itself an Attraction, so it can't be its own ancestor, and a chain's locations are
 *  expected to span many countries. */
export async function resolveBrandLink(brandId: string): Promise<IBrand> {
  await dbConnect();
  const brand = await Brand.findById(brandId);
  if (!brand) throw badRequest("Brand not found");
  return brand;
}
