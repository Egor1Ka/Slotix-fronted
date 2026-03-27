# Dynamic Sidebar & Organizations — Design Spec

**Date:** 2026-03-27
**Status:** Approved

## Problem

The booking sidebar (`BookingSidebar.tsx`) has hardcoded staff IDs, org IDs, and navigation links. There is no concept of user-owned organizations, and all pages share the same sidebar regardless of auth state or context.

## Goals

1. Replace hardcoded sidebar with context-aware dynamic sidebars
2. Add organizations page (list + create)
3. Different sidebar per context (dashboard, personal schedule, org admin, public booking)
4. Public booking pages have no sidebar at all
5. Logout available in all authenticated sidebars

---

## Architecture: Route Groups

4 route groups under `app/[locale]/`, each with its own layout and sidebar:

```
app/[locale]/
├── (public)/                        # No sidebar, no auth
│   ├── layout.tsx                   # Plain content wrapper
│   ├── org/[orgId]/page.tsx         # Public org booking
│   └── book/[staffSlug]/page.tsx    # Public staff booking
│
├── (dashboard)/                     # DashboardSidebar
│   ├── layout.tsx                   # Auth guard + UserProvider + DashboardSidebar
│   └── organizations/page.tsx       # Org list + create button
│
├── (personal)/                      # PersonalSidebar
│   ├── layout.tsx                   # Auth guard + UserProvider + PersonalSidebar
│   └── schedule/page.tsx            # Personal calendar
│
├── (org)/                           # OrgSidebar
│   ├── layout.tsx                   # Auth guard + UserProvider + OrgSidebar
│   └── org/[orgId]/
│       ├── page.tsx                 # Org shared schedule
│       └── [staffId]/page.tsx       # Specific staff in org
```

### Auth Guard

Layouts for `(dashboard)`, `(personal)`, `(org)` call `getUser()` server-side. If no user — redirect to `/login`. The `(public)` layout has no auth check.

---

## Backend Changes (BackendTemplate)

### New Endpoints

**1. `GET /api/user/organizations`**

Returns organizations the authenticated user belongs to.

Response:
```json
[
  {
    "id": "org_abc123",
    "name": "Барбершоп Чемпіон",
    "logo": "https://...",
    "role": "owner",
    "status": "active"
  }
]
```

Implementation:
- Query `Membership` by `userId` from auth token
- Populate `Organization` data for each membership
- Return array of `{ id, name, logo, role, status }`

**2. `POST /api/org`**

Creates a new organization. Authenticated user becomes owner.

Request body:
```json
{
  "name": "Моя організація",
  "currency": "UAH",
  "logoUrl": "https://...",
  "brandColor": "#1a1a2e",
  "defaultTimezone": "Europe/Kyiv",
  "defaultCountry": "UA"
}
```

- `name` — required
- `currency` — enum `UAH` | `USD`, default `UAH`
- All other fields optional with sensible defaults

Side effects:
- Creates `Membership` with `role: "owner"`, `status: "active"` for the requesting user

Response: created organization object with `id`.

### Model Changes

**Organization model** — add field:
```js
currency: { type: String, enum: ["UAH", "USD"], default: "UAH" }
```

**No slug field** — all routing uses `id` instead of slug.

---

## Frontend: Sidebar Components

3 new sidebar components in `components/sidebar/`:

### DashboardSidebar

Used on `/organizations` page.

```
┌─────────────────────┐
│  Slotix (logo)      │
├─────────────────────┤
│  Мої організації     │  ← active
│  Мій розклад         │  ← link to (personal)/schedule
├─────────────────────┤
│                     │
├─────────────────────┤
│  User name          │
│  Вийти              │
└─────────────────────┘
```

### PersonalSidebar

Used on `/schedule` page.

```
┌─────────────────────┐
│  User name          │
├─────────────────────┤
│  Мій розклад         │  ← active
│  Мої організації     │  ← link to (dashboard)/organizations
├─────────────────────┤
│                     │
├─────────────────────┤
│  Вийти              │
└─────────────────────┘
```

### OrgSidebar

Used on `/org/[orgId]` pages. Fetches staff list from `GET /api/org/:id/staff`.

```
┌─────────────────────┐
│  Org name + logo    │
├─────────────────────┤
│  Загальний розклад   │  ← active (on org page)
│  Staff list:        │
│    - Staff 1        │  ← link to /org/[orgId]/[staffId]
│    - Staff 2        │
├─────────────────────┤
│  ← Назад до оргів   │  ← link to (dashboard)/organizations
├─────────────────────┤
│  Вийти              │
└─────────────────────┘
```

### Shared Behavior

- Active link highlighted via `usePathname()` + `useLocale()`
- Logout calls `POST /api/auth/logout` → redirect to `/login`
- All sidebars use existing `components/ui/sidebar.tsx` primitives
- Mobile: sidebar transforms to sheet/drawer (built into sidebar component)

---

## Frontend: Organizations Page

Route: `(dashboard)/organizations/page.tsx`

### Organization List

- Responsive grid: 1 col (mobile) → 2 cols (md) → 3 cols (lg)
- Each card shows:
  - Logo (or fallback with first letter of name)
  - Organization name
  - Role badge: owner (purple), admin (blue), member (gray)
  - Status indicator: active (green dot), invited (yellow), suspended (red)
- Click on card → navigate to `/(org)/org/[orgId]`
- Data from `GET /api/user/organizations`

### Create Organization

- Button at top of page: "Створити організацію"
- Opens `Dialog` (modal) with form
- Form fields:

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Назва | Input text | Yes | — |
| Валюта | Select (UAH / USD) | Yes | UAH |
| Колір бренду | Color palette picker + HEX input | No | — |
| Логотип | Input URL | No | — |
| Таймзона | Select | No | Europe/Kyiv |
| Країна | Select | No | UA |

- Validation: `zod` + `react-hook-form`
- On success: `toast.success("Організацію створено")` + refetch org list
- On validation error: field-level errors via `setServerErrors()`

---

## Frontend: Public Pages (No Sidebar)

`(public)` route group — for non-authenticated visitors.

### `/org/[orgId]` — Public org booking
- Org header (name, logo)
- Staff selection (tabs or cards)
- Calendar with available slots
- Booking form (name, email, phone)
- No sidebar, no navigation header

### `/book/[staffSlug]` — Public staff booking
- Staff info (avatar, name, position)
- Calendar with available slots
- Booking form
- No sidebar, no navigation header

These pages reuse existing calendar/booking components, just wrapped in the `(public)` layout without sidebar.

---

## Frontend: API Layer

### New files

**`services/configs/org.types.ts`**
```ts
interface OrgListItem {
  id: string
  name: string
  logo: string | null
  role: "owner" | "admin" | "member"
  status: "active" | "invited" | "suspended" | "left"
}

interface CreateOrgBody {
  name: string
  currency: "UAH" | "USD"
  logoUrl?: string
  brandColor?: string
  defaultTimezone?: string
  defaultCountry?: string
}
```

**`services/configs/org.config.ts`**
```ts
- getUserOrgs:  GET  /api/user/organizations  → OrgListItem[]
- getById:      GET  /api/org/:id             → OrgByIdResponse
- getStaff:     GET  /api/org/:id/staff       → OrgStaffMember[]
- create:       POST /api/org                 → OrgByIdResponse
```

### New hook

**`useUserOrgs()`** — fetches user's organizations list, returns `{ orgs, isLoading, error, refetch }`.

### Removed

- `components/booking/BookingSidebar.tsx` — replaced by 3 new sidebars
- `components/booking/BookingLayout.tsx` — replaced by route group layouts
- Hardcoded staff/org data from sidebar

---

## Files Changed/Created

### Backend (BackendTemplate)
- `src/models/Organization.js` — add `currency` field
- `src/routes/subroutes/orgRoutes.js` — add `POST /`
- `src/routes/subroutes/userRoutes.js` — add `GET /organizations`
- `src/controllers/orgController.js` — add `handleCreateOrg`
- `src/controllers/userController.js` — add `handleGetUserOrgs`
- `src/services/orgServices.js` — add `createOrganization`
- `src/services/userServices.js` — add `getUserOrganizations`
- `src/repository/organizationRepository.js` — add `createOrg`
- `src/repository/membershipRepository.js` — add `createMembership`
- `src/dto/orgDto.js` — add `toOrgListItemDto`

### Frontend (Slotix-fronted)
- `app/[locale]/(public)/layout.tsx` — new, no sidebar
- `app/[locale]/(public)/org/[orgId]/page.tsx` — moved from current location
- `app/[locale]/(public)/book/[staffSlug]/page.tsx` — moved from current location
- `app/[locale]/(dashboard)/layout.tsx` — new, auth + DashboardSidebar
- `app/[locale]/(dashboard)/organizations/page.tsx` — new
- `app/[locale]/(personal)/layout.tsx` — new, auth + PersonalSidebar
- `app/[locale]/(personal)/schedule/page.tsx` — moved from staff/schedule
- `app/[locale]/(org)/layout.tsx` — new, auth + OrgSidebar
- `app/[locale]/(org)/org/[orgId]/page.tsx` — moved from staff/org
- `app/[locale]/(org)/org/[orgId]/[staffId]/page.tsx` — moved from staff/org
- `components/sidebar/DashboardSidebar.tsx` — new
- `components/sidebar/PersonalSidebar.tsx` — new
- `components/sidebar/OrgSidebar.tsx` — new
- `services/configs/org.types.ts` — new
- `services/configs/org.config.ts` — new
- `services/index.ts` — add orgApi export
- `lib/hooks/useUserOrgs.ts` — new
- `components/booking/BookingSidebar.tsx` — delete
- `components/booking/BookingLayout.tsx` — delete
- `i18n/messages/en.json` — add sidebar/org translations
- `i18n/messages/uk.json` — add sidebar/org translations
- `lib/auth-middleware.ts` — update protected paths
