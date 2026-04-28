# Stats Tab — Design Spec

**Date:** 2026-04-28
**Status:** Draft, awaiting user review
**Repos touched:** `Slotix-fronted` (frontend), `BackendTemplate` (backend)

## 1. Goal

Add a statistics dashboard with three independent contexts:

1. **Personal** (`/[locale]/stats`) — current user's bookings where `orgId === null`.
2. **Org admin** (`/[locale]/manage/[orgId]/stats`) — all bookings in a specific organization, with per-staff drill-down.
3. **Org member self** (`/[locale]/org/[orgId]/my-stats`) — current user's bookings inside a specific organization.

Each page shows the same widget shapes, scaled to its scope. Filtering is by date range and booking statuses (multi-select), plus by staff for the org-admin page.

## 2. Decisions captured during brainstorming

| # | Decision |
|---|---|
| 1 | Date picker = presets (Today / 7d / 30d / This month / This year) **plus** custom range |
| 2 | Widgets per page: time-series chart + status donut + top services + avg ticket KPI; **+ top staff** in org-admin |
| 3 | Personal scope = bookings where `orgId === null` only (multi-org consolidation is not in scope) |
| 4 | Aggregation is server-side. Dedicated endpoints, not client-side reduction over a booking list |
| 5 | Org admin sees full org stats with staff filter; org member sees their own stats inside the org as a separate page |
| 6 | Status filter is multi-select. Default = all non-archived. KPIs / time-series / top services / top staff respect filter. Status donut **always shows all** non-archived statuses. Sum is computed by booking total, not by `payment.status === 'paid'` |
| 7 | Architecture variant = three thin endpoints (`/personal`, `/org/:orgId`, `/org/:orgId/me`), shared internal aggregation service. Auth bound to URL via middleware |
| 8 | Single currency per page (resolved server-side from user/org settings) |
| 9 | URL search params are the source of truth for filter state |

## 3. Routes & sidebar

| Path | Visibility | Sidebar entry |
|---|---|---|
| `/[locale]/stats` | any authenticated user | `PersonalSidebar`, new group `groupAnalytics`, label key `sidebar.myStats` |
| `/[locale]/manage/[orgId]/stats` | `owner` / `admin` of the org | `OrgSidebar`, new group `groupAnalytics` (admin block), label key `sidebar.orgStats` |
| `/[locale]/org/[orgId]/my-stats` | any active member of the org | `OrgSidebar`, existing `groupPersonal`, label key `sidebar.myStatsInOrg` |

Icon: `BarChart3` from `lucide-react` for all three.

Client-side guard for `/manage/[orgId]/stats`: existing `manage/[orgId]/layout.tsx` (or `<StatsPage>` if layout has no guard) calls `orgApi.getMyMembership` and redirects to `/forbidden` for non-admin roles. The backend middleware enforces the same constraint regardless.

## 4. Backend

### 4.1 Endpoints

```
GET /api/stats/personal              — middleware: requireAuth
GET /api/stats/org/:orgId            — middleware: requireAuth + requireOrgAdmin
GET /api/stats/org/:orgId/me         — middleware: requireAuth + requireOrgMember
```

If `requireOrgAdmin` / `requireOrgMember` middleware does not exist yet in `BackendTemplate`, they are added as project-wide middleware (not part of the stats module).

### 4.2 Query parameters

| Parameter | Type | Required | Where |
|---|---|---|---|
| `from` | `YYYY-MM-DD` (wall-clock) | yes | all |
| `to` | `YYYY-MM-DD` (wall-clock, inclusive) | yes | all |
| `statusIds` | comma-separated booking status IDs | no — defaults to all non-archived statuses of scope | all |
| `staffId` | string | no | only `/org/:orgId` |

Validation via zod schema in `stats.middleware.ts`. Invalid params → 400 with `validationError`.

### 4.3 Timezone resolution (server-side)

* `/personal` → `User.timezone` if present, else `UTC`. (Adds `User.timezone` if not in model.)
* `/org/:orgId` and `/org/:orgId/me` → `Organization.timezone`, fallback `UTC`.

Wall-clock `from`/`to` are converted to UTC interval via `parseWallClockToUtc(from + 'T00:00:00', tz)` and `parseWallClockToUtc(to + 'T23:59:59.999', tz)` for the Mongo `$match` on `startAt`.

### 4.4 Response shape

```ts
interface StatsResponse {
  currency: string                 // resolved server-side: User.currency or Organization.currency
  timezone: string                 // resolved server-side
  granularity: 'day' | 'week' | 'month'
  kpi: {
    bookingsCount: number
    totalAmount: number
    avgTicket: number              // 0 when bookingsCount === 0
  }
  timeseries: TimeseriesPoint[]
  byStatus: StatusSlice[]          // all non-archived statuses of scope; status filter NOT applied
  topServices: TopServiceItem[]    // top 5 by bookingsCount; remaining collapsed into 'other'
  topStaff?: TopStaffItem[]        // present only on /org/:orgId admin endpoint
}

interface TimeseriesPoint {
  date: string                     // 'YYYY-MM-DD' wall-clock in resolved timezone
  bookingsCount: number
  totalAmount: number
}

interface StatusSlice {
  statusId: string
  label: string
  color: string
  bookingsCount: number
  totalAmount: number
}

interface TopServiceItem {
  eventTypeId: string | 'other'   // 'other' aggregates services beyond top 5
  name: string
  bookingsCount: number
  totalAmount: number
}

interface TopStaffItem {
  // top 10 by bookingsCount; no 'other' bucket — list is a leaderboard, not a pie
  staffId: string
  name: string
  avatar: string
  bookingsCount: number
  totalAmount: number
}
```

### 4.5 Granularity rule (server-side)

* `to − from ≤ 31 days` → `day`. Bucket key = `YYYY-MM-DD`.
* `32 ≤ days ≤ 180` → `week`. Bucket key = Monday of the ISO week, formatted `YYYY-MM-DD`.
* `> 180 days` → `month`. Bucket key = first day of the month, formatted `YYYY-MM-DD`.

Empty buckets in the range are filled with zeroes server-side so the frontend can render a continuous line without gap detection.

### 4.6 Aggregation strategy

Two Mongo aggregations run in parallel via `Promise.all`. They share the time/scope filters (`startAt` range, `userId` / `orgId` / `staffId`) but differ in whether the user-provided `statusIds` filter is applied.

**Aggregation A — filtered (status filter applied):**

```
$match { startAt in [from, to], scope filters, statusId in statusIds }
$facet {
  kpi:         $group total
  timeseries:  $group by bucket key (granularity-aware), then fill empty buckets in code
  topServices: $group by eventTypeId, $sort by bookingsCount desc, $limit 5; remainder collapsed to 'other' in code
  topStaff:    $group by staffId, $sort by bookingsCount desc, $limit 10  // only when scope === 'org-admin'
}
```

**Aggregation B — unfiltered by status:**

```
$match { startAt in [from, to], scope filters }     // statusIds NOT applied
$group by statusId → byStatus[]
```

`byStatus` always reflects the full distribution within the date range and scope, regardless of the status filter the user toggled in the UI.

### 4.7 Module layout

```
src/modules/stats/
  stats.routes.ts          // 3 route handlers, each ~5–10 lines
  stats.service.ts         // buildBookingStats({ scope, ownerId, orgId, staffId, from, to, statusIds })
  stats.dto.ts             // StatsQueryDto, StatsResponseDto
  stats.middleware.ts      // parseStatsQuery (zod)
```

Indexes added if missing: `bookings.{orgId, startAt}`, `bookings.{staffId, startAt}`, `bookings.{userId, startAt}`.

## 5. Frontend

### 5.1 File layout

```
components/stats/
  StatsPage.tsx              // client container: filters + fetch + layout
  StatsFilters.tsx           // composes DateRangeControl + StatusMultiSelect + (StaffSelect)
  DateRangeControl.tsx       // presets + Calendar popover for custom range
  StatusMultiSelect.tsx      // Popover + checkboxes over BookingStatusObject[]
  StaffSelect.tsx            // org-admin only
  KpiCards.tsx               // 3 cards: Bookings / Revenue / Avg Ticket
  TimeseriesChart.tsx        // recharts AreaChart with dual axes
  StatusDonut.tsx            // recharts PieChart, colors from BookingStatusObject.color
  TopServicesChart.tsx       // recharts horizontal BarChart
  TopStaffChart.tsx          // recharts horizontal BarChart, rendered only when topStaff present
  EmptyStatsState.tsx
  StatsSkeleton.tsx
  formatMoney.ts
  formatDateLabel.ts

hooks/
  useStatsFilters.ts         // URL <-> StatsFilters

services/configs/
  stats.config.ts
  stats.types.ts
```

`services/index.ts` exports `statsApi` with `defaultInterceptors`.

### 5.2 API config

```ts
const statsApiConfig = {
  personal: endpoint<void, ApiResponse<StatsResponse>>({
    url:    () => `/api/stats/personal`,
    method: getData,
    defaultErrorMessage: 'Failed to load statistics',
  }),
  org: endpoint<void, ApiResponse<StatsResponse>>({
    url:    ({ orgId }) => `/api/stats/org/${orgId}`,
    method: getData,
    defaultErrorMessage: 'Failed to load statistics',
  }),
  orgMe: endpoint<void, ApiResponse<StatsResponse>>({
    url:    ({ orgId }) => `/api/stats/org/${orgId}/me`,
    method: getData,
    defaultErrorMessage: 'Failed to load statistics',
  }),
}
```

Filters serialize into `query` (`MethodParams.query`).

### 5.3 Pages (thin wrappers)

```tsx
// app/[locale]/(personal)/stats/page.tsx
<StatsPage mode="personal" />

// app/[locale]/(org)/manage/[orgId]/stats/page.tsx
<StatsPage mode="org-admin" orgId={params.orgId} />

// app/[locale]/(org)/org/[orgId]/my-stats/page.tsx
<StatsPage mode="org-self" orgId={params.orgId} />
```

### 5.4 `<StatsPage>` responsibilities

* Reads filters from URL via `useStatsFilters`.
* Fetches:
  * `statsApi.personal | org | orgMe` — on every filter change. Previous request is aborted via existing `AbortController` in `request()`.
  * `bookingStatusesApi.list({ scope })` — once on mount, cached in component state. Source list for `<StatusMultiSelect>`.
  * `orgApi.getStaff({ id: orgId })` — only for `mode === 'org-admin'`, once on mount, cached.
* Derives:
  * Whether to render `<StaffSelect>` (only `org-admin`).
  * Whether to render `<TopStaffChart>` (only `org-admin` with `topStaff` present in response).
* Renders `<StatsSkeleton>` on first load. On subsequent loads renders previous data with `opacity-50` plus a top-right spinner — no flicker.

All presentational widgets (`KpiCards`, `*Chart`) take pre-computed `data` props and contain no fetching logic. They are pure of effects beyond rendering.

### 5.5 Filter state

URL is the single source of truth.

```
/[locale]/stats?from=2026-04-01&to=2026-04-28&status=stid_1,stid_2&preset=month
/[locale]/manage/abc/stats?from=...&to=...&status=...&staff=staffid_5&preset=custom
```

* `from`, `to` — `YYYY-MM-DD` wall-clock.
* `status` — CSV of status IDs. Empty / absent = all non-archived (canonical default URL has no `status` param).
* `staff` — single string ID, only on `/manage/:orgId/stats`.
* `preset` — `today | 7d | 30d | thisMonth | thisYear | custom`. Used only to highlight the active preset button; `from`/`to` are the canonical pair.

`hooks/useStatsFilters.ts`:

```ts
const useStatsFilters = (mode: StatsMode, timezone: string) => {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const filters    = parseFiltersFromParams(searchParams, mode, timezone)
  const setFilters = (next: StatsFilters) => {
    const params = serializeFiltersToParams(next, mode)
    router.replace(`${pathname}?${params}`)
  }

  return { filters, setFilters }
}
```

`parseFiltersFromParams` and `serializeFiltersToParams` are pure functions — unit-tested with round-trip cases.

Default filter state: preset `30d` — `from = todayInTz − 29 days`, `to = todayInTz`. Resolved against `timezone` from `User`/`Organization` (not browser).

### 5.6 Behavior of `<StatusMultiSelect>`

* Mounts → fetches scope status list (or uses prop from `<StatsPage>`).
* If URL `status` is empty → all checkboxes appear checked, URL stays clean.
* Unchecking one → URL writes CSV of the remaining IDs.
* All boxes re-checked → `status` param is removed from URL (canonical default).

### 5.7 Currency and number formatting

* `formatMoney(amount, currency, locale)` wraps `Intl.NumberFormat(locale, { style: 'currency', currency })`.
* Compact format on chart Y-axes for the money series: `Intl.NumberFormat(locale, { notation: 'compact' })`.
* Personal page assumes `User.currency`. If the field is missing in the model, it is added (default `'UAH'`).

### 5.8 Date formatting

* X-axis labels via `Intl.DateTimeFormat(locale, opts)`, `timeZone` set to the response's `timezone`.
* `granularity === 'day'`   → `{ month: 'short', day: 'numeric' }` → `13 Apr`.
* `granularity === 'week'`  → custom `formatDateLabel` showing `13–19 Apr`.
* `granularity === 'month'` → `{ month: 'long', year: 'numeric' }` → `April 2026`.
* All "today" computations go through `getTodayStrInTz(timezone)` from `lib/calendar/utils.ts`. New helpers `startOfMonthInTz` and `startOfYearInTz` are added there if missing.

### 5.9 Empty / error states

* `bookingsCount === 0` after a successful fetch → `<EmptyStatsState>` replaces the chart area. KPI cards still render (zeros). CTA: button "Expand to 90 days" that overwrites `from` to `today − 89`.
* 403 on org-admin endpoint (race between role change and navigation) → layout-level redirect to `/forbidden`. The `<StatsPage>` itself never receives a 403 in the happy path.
* 404 from API is treated as "no data" (empty response), not as a hard error.
* Network / timeout (status `0` or `408`) → toast (existing global interceptor) plus an inline retry block in the chart area. Retry is `setFilters(filters)` — same URL, re-fetch.

## 6. i18n

The shape below defines the **key tree** to add. The `"..."` placeholders are filled during implementation with copy in EN and UK — copy is not part of this design.

`i18n/messages/{en,uk}.json` additions:

```jsonc
{
  "sidebar": {
    "groupAnalytics":  "...",
    "myStats":         "...",
    "orgStats":        "...",
    "myStatsInOrg":    "..."
  },
  "stats": {
    "title":   "...",
    "kpi":     { "bookings": "...", "revenue": "...", "avgTicket": "..." },
    "filters": { "dateRange": "...", "status": "...", "staff": "..." },
    "presets": { "today": "...", "7d": "...", "30d": "...", "thisMonth": "...", "thisYear": "...", "custom": "..." },
    "charts":  { "timeseries": "...", "byStatus": "...", "topServices": "...", "topStaff": "..." },
    "empty":   { "title": "...", "expandRange": "..." }
  }
}
```

## 7. Testing scope

* Unit: `parseFiltersFromParams` ↔ `serializeFiltersToParams` round-trip with default and edge inputs.
* Unit: `formatDateLabel` for each granularity.
* Unit: `formatMoney` with UAH and USD.
* Smoke: `<StatsPage mode='personal'>` rendered with mocked `statsApi.personal` (success, empty, error responses).

E2E is out of scope — the project has no e2e suite.

## 8. Out of scope

* Cross-org consolidation in personal stats (decision #3).
* Currency conversion across orgs.
* `payment.status === 'paid'` separation from booking total (could be added later as a second KPI card).
* Per-widget independent fetching (decision #7).
* Real-time updates / WebSockets.
* CSV / PDF export.
* Cohort / retention analytics.

## 9. Dependencies and migrations

* No new npm packages on the frontend (`recharts`, `lucide-react`, `next-intl`, shadcn primitives — all already present).
* Backend: no new packages assumed (existing zod / Mongo driver).
* Possible model additions: `User.currency`, `User.timezone` if missing.
* Possible Mongo indexes: `bookings.{orgId, startAt}`, `bookings.{staffId, startAt}`, `bookings.{userId, startAt}`.

These are confirmed during planning by inspecting the current `BackendTemplate/src/models` files.
