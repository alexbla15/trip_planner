# Task: Personal Profile Page

Status: intake

Track: A
Track reason: new /profile page combining user info with personal analytics; no existing profile UI pattern

## Problem
Logged-in users have no dedicated place to see their own stats, manage their profile info (name, avatar URL), or understand their travel activity at a glance. The personal summary API (`GET /api/analytics/summary`) exists but is never displayed.

## Goal
A `/profile` page that shows the logged-in user's profile info, editable name/avatar URL, and their personal travel stats from `GET /api/analytics/summary`.

## Requirements

### Route
`/profile` — protected by RouteGuard
Add a "Profile" link to the Navbar avatar dropdown (Lucide `User` icon) next to "Log out"

### Sections

**1 — Profile header**
- Large avatar circle (60px, same gradient style as Navbar avatar but larger) showing user initial
- User name (h1, editable inline — click pencil icon → input → save via PUT /api/users/me)
- Email (read-only, shown below name)
- Joined date (`createdAt` formatted)
- "Edit profile" expands an inline form for `name` and `avatarUrl` (URL input); "Save" calls `PUT /api/users/me`; updates `AuthContext` user on success

**2 — Personal stats cards** (from `GET /api/analytics/summary`)
4-card grid (same stat card pattern as analytics page):
- My Trips → `MapPinned`
- My Attractions → `Landmark`
- Cities Visited → `Building2`
- Countries Visited → `Globe`
- Personal Budget Planned → `DollarSign`

**3 — My Category Breakdown** (from `categoryDistribution` in summary)
Same horizontal CSS bar chart as analytics page, but filtered to this user's attraction types. Title: "My Favourite Attraction Types". Show message "No attractions yet — start planning!" if empty.

**4 — Quick links**
Two action cards:
- "Plan a new trip" → `/new-trip`
- "View my trips" → `/trips`

### Non-functional
- Loading skeleton while fetching
- Error state if API fails
- Accessible: all interactive elements labelled, inline edit has focus management

## Constraints
- CSS Modules only, no inline styles
- Reuse stat card and bar chart CSS patterns from analytics page (or accept some duplication)
- AuthContext must be updated after profile edit so the Navbar name updates immediately

## Out of scope
- Avatar image upload (stays as URL string)
- Account deletion
- Password change
- Notification preferences
