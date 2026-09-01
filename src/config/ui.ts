export const DEFAULT_DAY_START = 7;          // first visible hour on the calendar timeline
export const DEFAULT_DAY_END = 23;            // last visible hour on the calendar timeline
export const SLOT_HEIGHT_PX = 60;             // px per hour on the timeline
export const MIN_CARD_HEIGHT_PX = 20;         // minimum attraction block height in px
export const MIN_BLOCK_WIDTH_PX = 110;        // minimum block width when side-by-side in overlap layout
export const MIN_OVERLAP_DURATION_MINS = 30;  // minimum duration assumed when calculating overlap
export const ATTRACTIONS_PAGE_SIZE = 5;      // attractions per page in the trip detail list
export const TABLE_PAGE_SIZE = 5;             // max rows per page for any paginated data table
// Explore's grid view — page size is computed from how many columns actually fit the
// viewport (see ExploreClient.tsx), not a fixed count, so a wide screen doesn't paginate
// after only a fraction of a row's worth of unused space. These two must match the
// `.grid` rule's `minmax(180px, 1fr)` / `gap` in ExploreClient.module.css.
export const EXPLORE_GRID_CARD_MIN_WIDTH_PX = 180;
export const EXPLORE_GRID_GAP_PX = 16;
export const EXPLORE_GRID_ROWS_PER_PAGE = 3;
// Floor on the computed columns × rows page size — a narrow viewport (few columns) would
// otherwise paginate after as few as 3-6 cards, which feels broken on mobile.
export const EXPLORE_GRID_MIN_PAGE_SIZE = 20;
