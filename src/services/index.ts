export { ApiError, parseOrThrow } from "./http";

export { login, register, demoLogin, forgotPassword, resetPassword } from "./auth.service";
export type { MessageResponse } from "./auth.service";
export type { RegisterResponse } from "./auth.service";
export type { AuthResponse } from "./auth.service";
export type { ResetPasswordResponse } from "./auth.service";

export { getCurrentUser, updateCurrentUser, changePassword, searchUsers } from "./users.service";

export { getPersonalAnalytics, getGlobalAnalytics } from "./analytics.service";

export { listTrips, createTrip, getTrip, updateTrip, deleteTrip, swapTripDays } from "./trips.service";
export type { TripErrorResponse } from "./trips.service";

export { addCollaborator, removeCollaborator } from "./collaborators.service";

export { getFxRate } from "./fx.service";

export {
  getCities,
  getExploreItems,
  getAttraction,
  getAttractionsByCity,
  getAttractionsByCountry,
  getChildAttractions,
  searchAttractionsByCountry,
  searchAttractionsByType,
  createAttraction,
  updateAttraction,
  deleteAttraction,
  getTripAttractions,
  addAttractionToTrip,
  updateTripAttractionSchedule,
  removeAttractionFromTrip,
  markAttractionVisited,
  unmarkAttractionVisited,
} from "./attractions.service";

export {
  fetchAttractionTypes,
  createAttractionType,
  updateAttractionType,
  deleteAttractionType,
} from "./attractionTypes.service";

export {
  fetchAttractionCategories,
  createAttractionCategory,
  updateAttractionCategory,
  deleteAttractionCategory,
  migrateLegacyTypes,
} from "./attractionCategories.service";

export {
  fetchMoodTags,
  createMoodTag,
  updateMoodTag,
  deleteMoodTag,
  seedMoodTags,
} from "./moodTags.service";

export {
  fetchFoodStyles,
  createFoodStyle,
  updateFoodStyle,
  deleteFoodStyle,
} from "./foodStyles.service";

export { getCityBoundary, getCountryBoundary, getWorldCountriesGeoJson } from "./geo.service";

export { reverseGeocode, searchLocation } from "./geocoding.service";

export {
  fetchRouteLeg,
  fetchAirportLeg,
  fetchRouteMatrix,
  formatLegDuration,
  formatStepDuration,
} from "./routeTransit.service";
export type { TravelMode, RouteLeg, RouteStep } from "./routeTransit.service";
