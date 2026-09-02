import { dbConnect } from "@/lib/mongoose";
import { notFound } from "@/lib/apiError";
import { AdminMessage, type IFieldChange } from "@/models/AdminMessage";
import { User } from "@/models/User";
import type { IAttraction } from "@/models/Attraction";
import type { JwtPayload } from "@/lib/auth";

/** Top-level attraction fields worth surfacing in an edit-notification message. Deliberately
 *  excludes bookkeeping fields (ownerId, timestamps, per-instance trip-schedule fields) that
 *  either never change via an edit or aren't meaningful to an admin reviewing a diff. */
const TRACKED_FIELDS = [
  "name", "country", "city", "coordinates", "parentAttractionId", "types", "foodStyles",
  "durationValue", "durationUnit", "price", "prices", "currency", "openingHours",
  "openingMonths", "seasonalHours", "notes", "photoUrl", "websiteUrl",
  "verified", "subtype", "residenceType", "checkInDate", "checkOutDate",
  "flightNumber", "airline", "departureAirport", "arrivalAirport", "departureTime",
  "arrivalTime", "gate", "seat",
] as const;

/** Shallow snapshot of the tracked fields, taken before `updateAttraction` mutates the
 *  document — pass the result to `createAttractionEditMessage` after saving. */
export function snapshotAttraction(attraction: IAttraction): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const field of TRACKED_FIELDS) {
    // JSON round-trip strips Mongoose subdocument/ObjectId wrappers so the before/after
    // comparison below is a plain-value diff, not an identity comparison of live objects
    // (which would always report "changed" since the document itself was mutated in place).
    const value = (attraction as unknown as Record<string, unknown>)[field];
    snapshot[field] = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }
  return snapshot;
}

function diffSnapshots(before: Record<string, unknown>, after: Record<string, unknown>): IFieldChange[] {
  const changes: IFieldChange[] = [];
  for (const field of TRACKED_FIELDS) {
    const oldValue = before[field];
    const newValue = after[field];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, oldValue: oldValue ?? null, newValue: newValue ?? null });
    }
  }
  return changes;
}

/** Records an admin-facing notification for an edit to an EXISTING attraction — the diff
 *  between `before` (captured via `snapshotAttraction` prior to mutation) and the saved
 *  document. No-op (returns without writing) when nothing tracked actually changed, so a
 *  save that only touches untracked fields doesn't generate noise. */
export async function createAttractionEditMessage(
  editor: JwtPayload,
  attraction: IAttraction,
  before: Record<string, unknown>
): Promise<void> {
  const after = snapshotAttraction(attraction);
  const changes = diffSnapshots(before, after);
  if (changes.length === 0) return;

  await dbConnect();
  const editorDoc = await User.findById(editor.userId).select("name");

  await AdminMessage.create({
    attractionId: attraction._id,
    attractionName: attraction.name,
    editedBy: editor.userId,
    editedByName: editorDoc?.name ?? "Unknown user",
    editedAt: new Date(),
    changes,
    read: false,
  });
}

export interface ListAdminMessagesOptions {
  unreadOnly?: boolean;
}

export async function listAdminMessages(options: ListAdminMessagesOptions = {}) {
  await dbConnect();
  const filter = options.unreadOnly ? { read: false } : {};
  return AdminMessage.find(filter).sort({ editedAt: -1 });
}

export async function getUnreadAdminMessageCount(): Promise<number> {
  await dbConnect();
  return AdminMessage.countDocuments({ read: false });
}

export async function setAdminMessageRead(id: string, read: boolean) {
  await dbConnect();
  const message = await AdminMessage.findByIdAndUpdate(id, { read }, { new: true });
  if (!message) throw notFound("Message not found");
  return message;
}
