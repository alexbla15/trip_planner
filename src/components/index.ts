export { Navbar } from "./Navbar";
export { Footer } from "./Footer";
export { ThemeToggle } from "./ThemeToggle";
export { RouteGuard } from "./RouteGuard";
export { ModalShell } from "./Modal";
export type { ModalShellProps, ModalShellStyles } from "./Modal";
export { Spinner } from "./Spinner";
export type { SpinnerProps } from "./Spinner";
export { FormErrorBanner } from "./FormErrorBanner";
export type { FormErrorBannerProps } from "./FormErrorBanner";
export { FormFieldError } from "./FormFieldError";
export type { FormFieldErrorProps } from "./FormFieldError";
export { RouteLoading } from "./RouteLoading";
export type { RouteLoadingProps } from "./RouteLoading";
export { RouteError } from "./RouteError";
export type { RouteErrorProps } from "./RouteError";

export { TripCard, TripCardSkeleton } from "./TripCard";
export type { TripCardProps } from "./TripCard";
export { NewTripCard } from "./NewTripCard";
export { ExploreCard } from "./ExploreCard";
export type { ExploreCardProps } from "./ExploreCard";
export { ExploreSection } from "./ExploreSection";
export type { ExploreSectionProps } from "./ExploreSection";

export { MoodTagChip } from "./MoodTagChip";
export type { MoodTagChipProps } from "./MoodTagChip";
export { PrivateChip } from "./PrivateChip";
export type { PrivateChipProps } from "./PrivateChip";
export { MoodTagButton } from "./MoodTagButton";
export type { MoodTagButtonProps } from "./MoodTagButton";

export {
  NewAttractionModal,
  MapPicker,
  OpeningHoursGrid,
  AttractionTypeChip,
} from "./NewAttractionModal";
export type {
  AttractionFormData,
  NewAttractionModalProps,
  AttractionType,
  DurationUnit,
  OpeningHours,
  Coordinates,
} from "./NewAttractionModal";
export { COUNTRIES, DEFAULT_OPENING_HOURS, DAY_KEYS } from "./NewAttractionModal";

export { AttractionPickerModal } from "./AttractionPickerModal";
export { AttractionDetailModal } from "./AttractionDetailModal";
export { AttractionSearchModal } from "./AttractionSearchModal";
export type { AttractionSearchModalProps } from "./AttractionSearchModal";
export { CategoryAttractionsModal } from "./CategoryAttractionsModal";
export type { CategoryAttractionsModalProps } from "./CategoryAttractionsModal";
export { AttractionFilter } from "./AttractionFilter";
export type { AttractionFilterProps } from "./AttractionFilter";
export { AttractionTypePicker } from "./AttractionTypePicker";

export { AddResidenceModal } from "./AddResidenceModal";
export type { ResidenceFormData, AddResidenceModalProps, ResidenceInitialData, ResidencePrefillData } from "./AddResidenceModal";
export { AddFlightModal } from "./AddFlightModal";
export type { FlightFormData, AddFlightModalProps, FlightInitialData } from "./AddFlightModal";
export { AddCustomSlotModal } from "./AddCustomSlotModal";
export type { CustomSlotFormData, AddCustomSlotModalProps } from "./AddCustomSlotModal";
export { AddFreeSlotModal } from "./AddFreeSlotModal";
export type { FreeSlotFormData, AddFreeSlotModalProps } from "./AddFreeSlotModal";

export { TripSharingPanel } from "./TripSharingPanel";
export type { TripSharingPanelProps } from "./TripSharingPanel";

export { CurrencySelect } from "./CurrencySelect";
export { IconPicker, ICON_REGISTRY, ICON_NAMES, getIconComponent, renderTypeIcon } from "./IconPicker";
export { TripTabBar } from "./TripTabBar";

export { CoverImageField, isValidCoverUrl } from "./CoverImageField";
export { ImageWithSkeleton } from "./ImageWithSkeleton";
export type { ImageWithSkeletonProps } from "./ImageWithSkeleton";
export { CategoryDonutChart } from "./CategoryDonutChart";
export { Carousel } from "./Carousel";
export type { CarouselProps } from "./Carousel";

// CitiesMap and CountriesMap are deliberately NOT re-exported as values here:
// both load Leaflet and run module-scope DOM/`window`-touching setup
// (L.Icon.Default.mergeOptions, etc.). Every consumer already loads them via
// next/dynamic({ ssr: false }) pointed at their own file directly, bypassing
// this barrel. Re-exporting them as values here pulled that module-scope code
// into the SSR graph of any page that imports anything else from @/components
// (e.g. AdminClient importing IconPicker), breaking prerendering with
// "window is not defined". The CityEntry type is safe to re-export — type-only
// imports are erased and never force module evaluation.
export type { CityEntry } from "./CitiesMap";

export { SectionCard } from "./SectionCard";
export { StatCardsGrid } from "./StatCardsGrid";
export type { StatCardItem } from "./StatCardsGrid";
export { RankedList } from "./RankedList";
export type { RankedListItem } from "./RankedList";
export { CountryFilterSelect } from "./CountryFilterSelect";

export { Toast, ToastViewport } from "./Toast";
export type { ToastItem, ToastVariant } from "./Toast";

export { Pagination, usePagination } from "./Pagination";
export type { PaginationProps } from "./Pagination";

export { TripPickerModal } from "./TripPickerModal";
export type { TripPickerModalProps } from "./TripPickerModal";
