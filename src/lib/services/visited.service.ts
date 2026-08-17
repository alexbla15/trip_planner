import { dbConnect } from "@/lib/mongoose";
import { User } from "@/models/User";

/** Marks an attraction as visited for this user (idempotent). */
export async function markVisited(userId: string, attractionId: string): Promise<void> {
  await dbConnect();
  await User.findByIdAndUpdate(userId, { $addToSet: { visitedAttractionIds: attractionId } });
}

/** Unmarks an attraction as visited for this user (idempotent). */
export async function unmarkVisited(userId: string, attractionId: string): Promise<void> {
  await dbConnect();
  await User.findByIdAndUpdate(userId, { $pull: { visitedAttractionIds: attractionId } });
}

/** Real doc ids this user has marked visited, for merging `isVisited` onto a list of
 *  attractions in one query. Returns an empty set immediately for an anonymous caller —
 *  visited status only exists for a logged-in user. */
export async function getVisitedIdSet(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  await dbConnect();
  const user = await User.findById(userId).select("visitedAttractionIds").lean();
  return new Set((user?.visitedAttractionIds ?? []).map((id) => id.toString()));
}

/** Whether this user has marked a single attraction visited — cheaper than
 *  `getVisitedIdSet` when only one doc's status is needed (e.g. after a PUT/create). */
export async function isAttractionVisited(userId: string | null, attractionId: string): Promise<boolean> {
  if (!userId) return false;
  await dbConnect();
  const exists = await User.exists({ _id: userId, visitedAttractionIds: attractionId });
  return !!exists;
}
