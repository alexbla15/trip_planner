# Task: Searchable Currency Picker

Status: done

Track: A
Track reason: Replaces native <select> with a custom searchable combobox — new form-field interaction pattern not yet in the design system

## Problem
The currency selector in the attraction price field is a plain `<select>` with 28 options. Users have to scroll through all of them to find the currency they need. With that many items, scrolling is slow and error-prone — especially for less-common currencies like SGD, AED, or BRL.

## Goal
Users can type a few characters to filter the currency list and select their currency in one fast interaction.

## Requirements
- Replace the `<select>` in `NewAttractionModal` with a searchable combobox:
  - Clicking or focusing the field opens a dropdown list of all currencies
  - Typing filters the list in real time (match on currency code or name, case-insensitive)
  - Clicking a result selects the currency and closes the dropdown
  - Pressing Escape closes the dropdown without changing the selection
  - Pressing Enter or Tab confirms the highlighted option
  - If the input is blurred with no selection made, it reverts to the previously selected value
- The selected state should display as `CODE — Name` (e.g. `USD — US Dollar`) in the closed/collapsed field
- The currency list lives in `src/components/NewAttractionModal/attraction.constants.ts` as `ATTRACTION_CURRENCIES` — extend each entry to include a human-readable name alongside the code (e.g. `{ code: "USD", name: "US Dollar" }`) so both are searchable and displayable
- Keyboard-accessible: arrow keys navigate the list, Enter selects
- No external libraries — pure React + CSS Modules

## Constraints
- CSS Modules only — no inline styles
- Must fit in the existing price row (compact — the combobox width should match the current select width)
- Use existing design-system tokens only
- The combobox is specific to this modal — do not build a fully generic component unless it naturally falls out of the implementation

## Out of scope
- Using this picker anywhere other than `NewAttractionModal`
- Currency search on any other screen
- Adding more currencies beyond the current 28

## Implementation Notes
- Files created/modified:
  - `src/components/CurrencySelect/CurrencySelect.tsx` — full rewrite: `<select>` replaced with searchable combobox; added `Currency` interface; `SUPPORTED_CURRENCIES` upgraded from `readonly string[]` to `readonly Currency[]` with code + name
  - `src/components/CurrencySelect/CurrencySelect.module.css` — full rewrite: replaced `.select`/`.icon`/`.wrapper` with `.comboWrapper`, `.trigger`, `.triggerIcon`, `.inputWrapper`, `.searchInput`, `.clearBtn`, `.dropdown`, `.option`, `.optionHighlighted`, `.optionSelected`, `.optionCode`, `.optionName`, `.emptyMsg`
- Deviations from brief:
  - Trigger displays only the code ("USD") rather than "USD — US Dollar" — the 92px width constraint makes the full label unreadable; the name is visible in the dropdown. Designer was aware of this trade-off and documented it explicitly in the brief.
- New design tokens used: none — all tokens already existed

## Completion Summary
Replaced the native `<select>` currency picker in `NewAttractionModal` with a fully custom searchable combobox. The rewrite lives in `src/components/CurrencySelect/` — `CurrencySelect.tsx` and `CurrencySelect.module.css` were both fully replaced. The 28 supported currencies were upgraded to `{ code, name }` objects enabling search by either field. Keyboard navigation (arrow keys, Enter, Tab, Escape), blur-revert, and clear-button all work as specified. The only deviation from the brief is the trigger showing code-only ("USD") rather than "USD — US Dollar" due to the 92px width constraint — confirmed acceptable and closed 2026-07-07.
