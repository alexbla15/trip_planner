import type { Types } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { badRequest, notFound, forbidden, conflict } from "@/lib/apiError";
import { Trip, resolveRefId, type ITrip } from "@/models/Trip";
import { User } from "@/models/User";
import type { JwtPayload } from "@/lib/auth";

const OWNER_POPULATE = "name avatarUrl";
const COLLABORATOR_POPULATE = "name email avatarUrl";

function populateTrip<T extends { populate: (path: string, select: string) => T }>(query: T): T {
  return query.populate("ownerId", OWNER_POPULATE).populate("collaborators.userId", COLLABORATOR_POPULATE);
}

export interface TripListFilter {
  upcoming?: boolean;
  country?: string | null;
  mood?: string | null;
}

/** Trips where the user is the owner or a listed collaborator. */
export async function listTripsForUser(userId: string, filter: TripListFilter): Promise<ITrip[]> {
  await dbConnect();

  const query: Record<string, unknown> = {
    $or: [{ ownerId: userId }, { "collaborators.userId": userId }],
  };
  if (filter.upcoming) query.startDate = { $gt: new Date() };
  if (filter.country) query.country = { $regex: filter.country, $options: "i" };
  if (filter.mood) query.moods = filter.mood;

  return populateTrip(Trip.find(query).sort({ startDate: -1 })) as unknown as ITrip[];
}

interface CreateTripInput {
  name?: string;
  cities?: string[];
  country?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  moods?: string[];
  notes?: string;
  isPrivate?: boolean;
  collaboratorEmails?: string[];
}

export async function createTrip(payload: JwtPayload, body: CreateTripInput): Promise<ITrip> {
  const { name, cities, country, coverImage, startDate, endDate, budget, currency, moods, notes, isPrivate, collaboratorEmails } = body;

  if (!name?.trim() || !country?.trim() || !startDate || !endDate) {
    throw badRequest("name, country, startDate and endDate are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    throw badRequest("Invalid date range");
  }

  await dbConnect();

  let collaborators: { userId: Types.ObjectId }[] = [];
  if (collaboratorEmails?.length) {
    const emails = collaboratorEmails.map((e) => e.toLowerCase().trim()).filter((e) => e && e !== payload.email);
    const users = await User.find({ email: { $in: emails } });
    collaborators = users.map((u) => ({ userId: u._id }));
  }

  const trip = await Trip.create({
    ownerId: payload.userId,
    name: name.trim(),
    cities: cities ?? [],
    country: country.trim(),
    coverImage,
    startDate: start,
    endDate: end,
    budget,
    currency,
    moods: moods ?? [],
    notes,
    attractionIds: [],
    collaborators,
    isPrivate: isPrivate ?? false,
  });

  await trip.populate("ownerId", OWNER_POPULATE);
  await trip.populate("collaborators.userId", COLLABORATOR_POPULATE);
  return trip;
}

/** Fetches a trip by id, applying private-trip visibility rules. userId is null for unauthenticated callers. */
export async function getTripForViewer(tripId: string, userId: string | null): Promise<ITrip> {
  await dbConnect();
  const trip = await populateTrip(Trip.findById(tripId)) as unknown as ITrip | null;
  if (!trip) throw notFound("Trip not found");

  const isOwner = !!userId && resolveRefId(trip.ownerId) === userId;
  const isCollaborator = !!userId && trip.collaborators.some((c) => resolveRefId(c.userId) === userId);
  const isPublic = !trip.isPrivate;

  if (!isPublic && !isOwner && !isCollaborator) {
    throw forbidden("This trip is private");
  }
  return trip;
}

interface UpdateTripInput {
  name?: string;
  cities?: string[];
  country?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  moods?: string[];
  notes?: string;
  isPrivate?: boolean;
  collaboratorEmails?: string[];
}

/** Updates a trip; only the owner or a collaborator may call this (collaboratorEmails changes are owner-only and silently ignored otherwise). */
export async function updateTrip(payload: JwtPayload, tripId: string, body: UpdateTripInput): Promise<ITrip> {
  await dbConnect();

  const { name, cities, country, coverImage, startDate, endDate, budget, currency, moods, notes, isPrivate, collaboratorEmails } = body;

  // Built explicitly — avoids Mongoose Map-field change-detection bugs on `schedules`.
  const $set: Record<string, unknown> = {};
  if (name) $set.name = name.trim();
  if (cities !== undefined) $set.cities = cities;
  if (country) $set.country = country.trim();
  if (coverImage !== undefined) $set.coverImage = coverImage;
  if (startDate) $set.startDate = new Date(startDate);
  if (endDate) $set.endDate = new Date(endDate);
  if (budget !== undefined) $set.budget = budget;
  if (currency !== undefined) $set.currency = currency;
  if (moods) $set.moods = moods;
  if (notes !== undefined) $set.notes = notes;
  if (isPrivate !== undefined) $set.isPrivate = isPrivate;

  if (collaboratorEmails !== undefined) {
    const isOwner = await Trip.exists({ _id: tripId, ownerId: payload.userId });
    if (isOwner) {
      const emails = collaboratorEmails.map((e) => e.toLowerCase().trim()).filter((e) => e && e !== payload.email);
      const users = await User.find({ email: { $in: emails } });
      $set.collaborators = users.map((u) => ({ userId: u._id }));
    }
  }

  const filter = { _id: tripId, $or: [{ ownerId: payload.userId }, { "collaborators.userId": payload.userId }] };

  if (Object.keys($set).length === 0) {
    const trip = await populateTrip(Trip.findOne(filter)) as unknown as ITrip | null;
    if (!trip) throw notFound("Trip not found");
    return trip;
  }

  const updated = await populateTrip(Trip.findOneAndUpdate(filter, { $set }, { new: true, runValidators: true })) as unknown as ITrip | null;
  if (!updated) throw notFound("Trip not found");
  return updated;
}

/** Deletes a trip; owner-only. */
export async function deleteTrip(payload: JwtPayload, tripId: string): Promise<void> {
  await dbConnect();
  const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
  if (!trip) throw notFound("Trip not found");
  await trip.deleteOne();
}

/** Owner or collaborator reorders the trip's attraction list. */
export async function reorderTripAttractions(payload: JwtPayload, tripId: string, attractionIds: unknown): Promise<void> {
  await dbConnect();
  const trip = await Trip.findOne({
    _id: tripId,
    $or: [{ ownerId: payload.userId }, { "collaborators.userId": payload.userId }],
  });
  if (!trip) throw notFound("Trip not found");

  if (!Array.isArray(attractionIds)) {
    throw badRequest("attractionIds must be an array");
  }

  await Trip.findByIdAndUpdate(tripId, { attractionIds });
}

/** Swaps everything scheduled on two days — every schedule entry (regular attraction
 *  instances, custom time-slots, flights) with plannedDate === dayA moves to dayB and
 *  vice versa; plannedTime and every other field on each entry are untouched, so the
 *  same times of day just apply to the other date. Entries on neither day are untouched.
 *  Uses findByIdAndUpdate + $set, not trip.save() — trip.schedules is a Map-typed field
 *  and .save() can silently no-op on Map mutations (see docs/LEARNINGS.md). */
export async function swapTripDays(payload: JwtPayload, tripId: string, dayA: unknown, dayB: unknown): Promise<void> {
  await dbConnect();
  const trip = await Trip.findOne({
    _id: tripId,
    $or: [{ ownerId: payload.userId }, { "collaborators.userId": payload.userId }],
  });
  if (!trip) throw notFound("Trip not found");

  if (typeof dayA !== "string" || !dayA.trim() || typeof dayB !== "string" || !dayB.trim()) {
    throw badRequest("dayA and dayB are required");
  }
  if (dayA === dayB) {
    throw badRequest("dayA and dayB must be different days");
  }

  const set: Record<string, string> = {};
  for (const [key, entry] of trip.schedules?.entries() ?? []) {
    if (entry?.plannedDate === dayA) set[`schedules.${key}.plannedDate`] = dayB;
    else if (entry?.plannedDate === dayB) set[`schedules.${key}.plannedDate`] = dayA;
  }
  if (Object.keys(set).length === 0) return; // nothing scheduled on either day — no-op

  await Trip.findByIdAndUpdate(tripId, { $set: set });
}

/** Owner-only: invites a user (by email) as a collaborator. */
export async function addCollaborator(payload: JwtPayload, tripId: string, email: string | undefined): Promise<ITrip> {
  await dbConnect();

  const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
  if (!trip) throw notFound("Trip not found");

  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail) throw badRequest("email is required");
  if (normalizedEmail === payload.email) throw badRequest("You cannot add yourself as a collaborator");

  const invitee = await User.findOne({ email: normalizedEmail });
  if (!invitee) throw notFound("No account found with that email. They need to sign up first.");

  const alreadyAdded = trip.collaborators.some((c) => c.userId.toString() === invitee._id.toString());
  if (alreadyAdded) {
    throw conflict("User is already a collaborator");
  }

  const updated = await populateTrip(
    Trip.findOneAndUpdate(
      { _id: tripId, ownerId: payload.userId },
      { $push: { collaborators: { userId: invitee._id } } },
      { new: true }
    )
  ) as unknown as ITrip | null;
  if (!updated) throw notFound("Trip not found");
  return updated;
}

/** Owner-only: removes a collaborator. */
export async function removeCollaborator(payload: JwtPayload, tripId: string, targetUserId: string): Promise<ITrip> {
  await dbConnect();

  const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
  if (!trip) throw notFound("Trip not found");

  const exists = trip.collaborators.some((c) => c.userId.toString() === targetUserId);
  if (!exists) throw notFound("Collaborator not found");

  const updated = await populateTrip(
    Trip.findOneAndUpdate(
      { _id: tripId, ownerId: payload.userId },
      { $pull: { collaborators: { userId: targetUserId } } },
      { new: true }
    )
  ) as unknown as ITrip | null;
  if (!updated) throw notFound("Trip not found");
  return updated;
}
