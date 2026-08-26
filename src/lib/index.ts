// Deliberately excludes mongoose.ts, auth.ts, and email.ts: all are server-only
// (Node `mongoose` driver; `jsonwebtoken` + JWT_SECRET; `resend` SDK + RESEND_API_KEY).
// Re-exporting them here would pull server-only code into the module graph of any
// client component that imports anything else from this barrel. Their consumers
// (API route handlers) import them directly by filename instead — see docs/LEARNINGS.md.
//
// Also excludes mapIcons.tsx: it imports `react-dom/server` (renderToStaticMarkup),
// which Next.js forbids in any module reachable from a Client Component's graph.
// Barreling it here broke the build for every client component importing anything
// else from @/lib (e.g. TripCard, CurrencySelect). Its one consumer imports it
// directly from "@/lib/mapIcons" instead.

export { formatDisplayDate } from "./formatDate";
export { isValidUrl } from "./url";
export { AVATARS, randomAvatar } from "./avatarConstants";
export { isProduction } from "./isProduction";

export type { Currency } from "./currencies";
export { CURRENCIES, getCurrency, currencySymbol, isPostfixCurrency, formatPrice } from "./currencies";

export { NOTES_MAX, getDurationDays, getDateError, getNotesCountLevel } from "./tripForm";

export {
  toDateValue,
  buildISODateTime,
  addOneDay,
  getTripDays,
  formatDayLabel,
  getGreeting,
} from "./date";

export type { LayoutItem, ConflictGroup } from "./schedule";
export {
  timeToMins,
  attractionEndMins,
  legKey,
  sameCoordinates,
  detectConflicts,
  findRouteNeighbour,
  layoutTimed,
  nextSlotAfterLast,
  dayColumnWidth,
  calcDaySpanMinutes,
  calcSpend,
  fmt,
  slotTop,
  cardPx,
  makeHourSlots,
} from "./schedule";

export { polarToCartesian, donutSlicePath, tintColor } from "./geometry";

export type { LoginFormErrors, RegisterFormErrors } from "./validation";
export {
  validateLoginForm,
  validateRegisterForm,
  validateForgotPasswordForm,
  validateResetPasswordForm,
} from "./validation";

export type { TypeFormState, CategoryFormState, MoodTagFormState } from "./adminForms";
export { typeFormFromRecord, catFormFromRecord, moodFormFromRecord } from "./adminForms";

export { flightMeta } from "./attractionDisplay";

export { getNightsCount } from "./residence";

export { buildInitialHours, normalizeOpeningHours, hasOpeningHoursData, isAllDay24h, isPermanentlyClosed, getUniformHoursLabel } from "./openingHours";

export type { StatusChipDescriptor } from "./attractionStatusChips";
export { getStatusChips } from "./attractionStatusChips";

export { ALL_MONTHS, isYearRound, formatOpeningMonthsLabel } from "./openingMonths";

export { haversineKm } from "./geo";

export { DAY_COLOR_PALETTE, UNSCHEDULED_DAY_COLOR, buildDayColorMap } from "./dayColors";
