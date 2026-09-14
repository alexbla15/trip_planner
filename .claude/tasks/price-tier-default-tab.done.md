Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-14.

## Request
When filling out pricing tiers without specifying a tab name (product),
each tier was landing in its own separate tab. Should share one tab instead.

## Problem
`getPriceProductKey` (AttractionDetailModal.utils.ts) grouped tiers by
`tier.product || tier.label`. When `product` was left blank, it fell back to
`label`, so differently-labeled tiers (Adult/Child/Senior, etc.) each got
their own tab instead of sharing a default one.

## Fix
`src/components/AttractionDetailModal/AttractionDetailModal.utils.ts`:
`getPriceProductKey` now falls back to a shared `DEFAULT_PRODUCT_KEY`
constant instead of `tier.label`. `buildPriceTierTabs` now also returns a
`label` field per tab (the raw product name, or "General" for the default
group) so the UI has something readable to show instead of the internal key.
`AttractionDetailModal.tsx`: both places that rendered `tab.key` as the
visible label now render `tab.label` instead.

## Implementation Notes
- `tsc --noEmit`: clean.
- Verified the grouping logic directly (temp node script mirroring the
  runtime behavior): three tiers with different labels and no `product` now
  produce a single tab (`{ key: "__default__", label: "General" }`)
  containing all three, instead of three separate tabs.
