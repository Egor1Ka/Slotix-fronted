# Timezone Contract & Bug Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a single timezone contract across frontend and backend, fix 6 timezone bugs, document rules in CLAUDE.md for both repos.

**Architecture:** All dates stored as UTC in MongoDB. `ScheduleTemplate.timezone` is the single source of truth for slot/booking logic. Frontend sends wall-clock times as naive ISO (no `Z`), backend converts via `parseWallClockToUtc`. Display always uses `Intl.DateTimeFormat` with explicit `timeZone`.

**Tech Stack:** Node.js (backend), Next.js/React/TypeScript (frontend), MongoDB, `Intl.DateTimeFormat` API

---

### Task 1: Timezone Contract in Slotix CLAUDE.md

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/CLAUDE.md`

- [ ] **Step 1: Add Timezone Contract section to CLAUDE.md**

Add after the `## Docker` section (before `## Monitoring`):

````markdown
## Timezone Contract

All date/time handling follows a single contract across frontend and backend.

### Storage

- All `Date` fields in MongoDB are stored in **UTC**
- Timezone strings are stored as IANA identifiers (e.g. `"Europe/Kyiv"`, `"America/New_York"`)

### Timezone Priority (highest → lowest)

1. **`ScheduleTemplate.timezone`** — single source of truth for slot grid, booking creation, display
2. **`Organization.timezone`** — default for new schedules; NOT used in runtime slot/booking logic
3. **`"UTC"`** — last-resort fallback; never hardcode a specific city (no `"Europe/Kyiv"`)

### Frontend → Backend Contract

- `startAt` is sent as **naive wall-clock ISO** without `Z` suffix: `"2026-04-15T14:00:00"`
- The `timezone` field is sent alongside for informational purposes (client's timezone)
- Backend reads `ScheduleTemplate.timezone` and calls `parseWallClockToUtc(startAt, template.timezone)`

### Display Rules

- Always use `Intl.DateTimeFormat` with explicit `timeZone` parameter
- Never use `.split('T')[0]` to extract date from ISO — use `dateFromISO(iso, timezone)` from `lib/booking-utils.ts`
- Never use `new Date()` for "today" — use `getTodayStrInTz(timezone)` from `lib/calendar/utils.ts`
- Never use `formatDateISO(new Date())` for default date — use browser timezone: `new Intl.DateTimeFormat('en-CA').format(new Date())`

### Forbidden Patterns

```ts
// WRONG: Z suffix on wall-clock time
const startAt = `${date}T${time}:00.000Z`

// WRONG: naive date extraction from UTC ISO
const date = isoString.split('T')[0]

// WRONG: UTC-based "today"
const today = formatDateISO(new Date())

// WRONG: browser-local comparison without timezone
return new Date(dateStr + 'T23:59:59') < new Date()

// WRONG: hardcoded city fallback
const tz = template?.timezone ?? 'Europe/Kyiv'
```
````

### Correct Patterns

```ts
// wall-clock time without Z
const startAt = `${date}T${time}:00`

// timezone-aware date extraction
const date = dateFromISO(isoString, timezone)
// or: new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(iso))

// timezone-aware "today"
const today = getTodayStrInTz(timezone)

// timezone-aware past check
const todayStr = getTodayStrInTz(timezone)
return dateStr < todayStr

// fallback chain (never hardcode a city)
const tz = template?.timezone ?? org?.timezone ?? 'UTC'
```

````

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: добавить Timezone Contract в CLAUDE.md"
````

---

### Task 2: Timezone Contract in BackendTemplate CLAUDE.md

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/CLAUDE.md`

- [ ] **Step 1: Add Timezone Contract section to BackendTemplate CLAUDE.md**

Add a `## Timezone Contract` section with the backend-specific rules:

````markdown
## Timezone Contract

### Storage

- All `Date` fields in MongoDB are **UTC**
- Timezone strings: IANA identifiers (`"Europe/Kyiv"`, `"America/New_York"`)

### Timezone Priority (highest → lowest)

1. **`ScheduleTemplate.timezone`** — source of truth for slot grid, booking parsing, notifications
2. **`Organization.timezone`** — default for new schedules; fallback when template unavailable
3. **`"UTC"`** — last-resort fallback; never hardcode a specific city

### Parsing Input

- Frontend sends `startAt` as naive wall-clock: `"2026-04-15T14:00:00"` (no `Z`, no offset)
- Backend resolves `template.timezone` and calls `parseWallClockToUtc(startAt, template.timezone)`
- `parseWallClockToUtc` uses double-conversion to handle DST transitions safely

### Notification Timezone Resolution

- Telegram/email: resolve timezone via fallback chain `template.timezone → org.timezone → "UTC"`
- Never hardcode `"Europe/Kyiv"` or any specific city as fallback

### Override Dates

- Override `date` field stored as `Date` at UTC midnight (`2026-04-15T00:00:00.000Z`)
- Frontend must send date-only string `"YYYY-MM-DD"`; server normalizes to UTC midnight

### Forbidden Patterns

```js
// WRONG: hardcoded city fallback
const tz = template?.timezone ?? 'Europe/Kyiv'

// CORRECT: fallback chain
const tz = template?.timezone ?? org?.timezone ?? 'UTC'
```
````

````

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: добавить Timezone Contract в CLAUDE.md"
````

---

### Task 3: Fix `startAt` false `Z` suffix (Frontend)

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/lib/calendar/hooks/useBookingActions.ts:182`

- [ ] **Step 1: Remove `.000Z` from startAt construction**

Change line 182 from:

```ts
const startAt = `${resolvedDate}T${resolvedSlotTime}:00.000Z`
```

to:

```ts
const startAt = `${resolvedDate}T${resolvedSlotTime}:00`
```

- [ ] **Step 2: Verify dev server still works**

Open a booking page in browser, pick a slot, submit. Check Network tab — `startAt` should no longer have `Z` suffix.

- [ ] **Step 3: Commit**

```bash
git add lib/calendar/hooks/useBookingActions.ts
git commit -m "fix(booking): убрать ложный Z-суффикс из startAt wall-clock времени"
```

---

### Task 4: Fix `extractDate` in BookingsTab (Frontend)

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/staff-schedule/BookingsTab.tsx`

- [ ] **Step 1: Replace naive `extractDate` with timezone-aware `dateFromISO`**

Add import at top of file:

```ts
import { dateFromISO } from '@/lib/booking-utils'
```

Remove the `extractDate` function (line 44):

```ts
// DELETE THIS LINE:
const extractDate = (isoString: string): string => isoString.split('T')[0]
```

Update `groupByDate` to accept timezone parameter and use `dateFromISO`:

```ts
const groupByDate = (
	bookings: StaffBooking[],
	timezone: string,
): Map<string, StaffBooking[]> => {
	const groups = new Map<string, StaffBooking[]>()

	const addToGroup = (booking: StaffBooking) => {
		const date = dateFromISO(booking.startAt, timezone)
		const existing = groups.get(date) ?? []
		groups.set(date, [...existing, booking])
	}

	bookings.forEach(addToGroup)
	return groups
}
```

Update `toBookingDetail` to accept timezone and use `dateFromISO`:

```ts
const toBookingDetail = (
	booking: StaffBooking,
	timezone: string,
): BookingDetail => ({
	id: booking.id,
	eventTypeName: booking.eventTypeName,
	color: booking.color,
	startAt: booking.startAt,
	endAt: booking.endAt,
	timezone: booking.timezone,
	durationMin: Math.round(
		(new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) /
			60000,
	),
	date: dateFromISO(booking.startAt, timezone),
	status: booking.status,
	invitee: {
		name: booking.invitee.name,
		email: booking.invitee.email,
		phone: booking.invitee.phone,
	},
	payment: { status: 'unknown', amount: 0, currency: '' },
})
```

- [ ] **Step 2: Update call sites**

Update line ~196 where `groupByDate` is called:

```ts
const grouped = groupByDate(bookings, timezone)
```

Update `renderDateGroup` — the `onBookingClick` handler wraps `toBookingDetail`. Find where `toBookingDetail` is used and pass timezone. The `handleBookingClick` sets `selectedBooking` directly from `StaffBooking`, and `toBookingDetail` is called in the `BookingDetailPanel` render. Update that call:

```ts
<BookingDetailPanel
	booking={toBookingDetail(selectedBooking, timezone)}
	onClose={handleCloseSheet}
	onStatusChange={handleStatusChange}
/>
```

- [ ] **Step 3: Verify in browser**

Open staff schedule page with bookings tab. Bookings should be grouped by correct date in the schedule timezone.

- [ ] **Step 4: Commit**

```bash
git add components/staff-schedule/BookingsTab.tsx
git commit -m "fix(bookings-tab): timezone-aware группировка бронирований по дате"
```

---

### Task 5: Fix default date on booking pages (Frontend)

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/app/[locale]/book/[staffSlug]/BookingPage.tsx:33`
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/booking/OrgCalendarPage.tsx:40`

- [ ] **Step 1: Fix BookingPage.tsx**

Change line 33 from:

```ts
const todayStr = (): string => formatDateISO(new Date())
```

to:

```ts
const todayStr = (): string =>
	new Intl.DateTimeFormat('en-CA').format(new Date())
```

Remove `formatDateISO` from imports if it's no longer used elsewhere in this file. Check the imports line for `formatDateISO` and remove it if unused.

- [ ] **Step 2: Fix OrgCalendarPage.tsx**

Change line 40 from:

```ts
const todayStr = (): string => formatDateISO(new Date())
```

to:

```ts
const todayStr = (): string =>
	new Intl.DateTimeFormat('en-CA').format(new Date())
```

Remove `formatDateISO` from imports if no longer used in this file.

- [ ] **Step 3: Verify in browser**

Open booking page without `?date=` param. Calendar should default to today in browser timezone (not UTC).

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/book/[staffSlug]/BookingPage.tsx components/booking/OrgCalendarPage.tsx
git commit -m "fix(calendar): дефолтная дата через browser timezone вместо UTC"
```

---

### Task 6: Fix `isDatePast` in OverridesTab (Frontend)

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/staff-schedule/OverridesTab.tsx`

- [ ] **Step 1: Import `getTodayStrInTz` and add timezone parameter**

Add import:

```ts
import { getTodayStrInTz } from '@/lib/calendar/utils'
```

Replace `isDatePast` (lines 30-33):

```ts
const isDatePast = (dateStr: string, timezone: string): boolean => {
	const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
	const todayStr = getTodayStrInTz(timezone)
	return dateOnly < todayStr
}
```

- [ ] **Step 2: Update call sites**

Update lines 110-116 to pass `timezone`:

```ts
const futureOverrides = overrides
	.filter((o) => !isDatePast(o.date, timezone))
	.sort(sortByDate)

const pastOverrides = overrides
	.filter((o) => isDatePast(o.date, timezone))
	.sort(sortByDateDesc)
```

- [ ] **Step 3: Commit**

```bash
git add components/staff-schedule/OverridesTab.tsx
git commit -m "fix(overrides): isDatePast с учётом timezone расписания"
```

---

### Task 7: Fix DST bug in `parseWallClockToUtc` (Backend)

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/shared/utils/timezone.js:19-24`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/__tests__/timezone.test.js`

- [ ] **Step 1: Write failing test for DST edge case**

Add to `/Users/egorzozula/Desktop/BackendTemplate/src/__tests__/timezone.test.js`:

```js
import { parseWallClockToUtc } from '../shared/utils/timezone.js'

test('parseWallClockToUtc: basic conversion Europe/Kyiv 14:00 (DST +3)', () => {
	const result = parseWallClockToUtc('2026-04-15T14:00:00', 'Europe/Kyiv')
	assert.equal(result.toISOString(), '2026-04-15T11:00:00.000Z')
})

test('parseWallClockToUtc: UTC passthrough', () => {
	const result = parseWallClockToUtc('2026-04-15T14:00:00', 'UTC')
	assert.equal(result.toISOString(), '2026-04-15T14:00:00.000Z')
})

test('parseWallClockToUtc: America/New_York 10:00 (DST -4)', () => {
	const result = parseWallClockToUtc('2026-04-15T10:00:00', 'America/New_York')
	assert.equal(result.toISOString(), '2026-04-15T14:00:00.000Z')
})

test('parseWallClockToUtc: DST spring-forward — 03:00 Kyiv on transition day', () => {
	// 2026-03-29 is DST transition in Europe/Kyiv: clocks jump from 03:00 to 04:00
	// wall-clock 04:30 should be valid and map to 01:30 UTC (offset +3)
	const result = parseWallClockToUtc('2026-03-29T04:30:00', 'Europe/Kyiv')
	assert.equal(result.toISOString(), '2026-03-29T01:30:00.000Z')
})

test('parseWallClockToUtc: DST fall-back — wall-clock in winter offset', () => {
	// 2026-10-25 is DST end in Europe/Kyiv: clocks go from 04:00 back to 03:00
	// wall-clock 02:30 should map to 00:30 UTC (offset +2 winter)
	const result = parseWallClockToUtc('2026-10-25T02:30:00', 'Europe/Kyiv')
	assert.equal(result.toISOString(), '2026-10-25T00:30:00.000Z')
})

test('parseWallClockToUtc: null/undefined input returns invalid gracefully', () => {
	const r1 = parseWallClockToUtc(null, 'UTC')
	assert.ok(isNaN(r1.getTime()))
	const r2 = parseWallClockToUtc('2026-04-15T10:00:00', null)
	assert.ok(!isNaN(r2.getTime()))
})
```

- [ ] **Step 2: Run tests to see which fail**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node --test src/__tests__/timezone.test.js
```

- [ ] **Step 3: Implement double-conversion fix**

Replace `parseWallClockToUtc` in `/Users/egorzozula/Desktop/BackendTemplate/src/shared/utils/timezone.js:19-24`:

```js
const parseWallClockToUtc = (isoString, timezone) => {
	if (!isoString || !timezone) return new Date(isoString)
	// Strip any trailing Z or offset — treat digits as wall-clock in `timezone`
	const cleaned = isoString.replace(/[Zz]$/, '').replace(/[+-]\d{2}:\d{2}$/, '')
	const parts = cleaned.match(
		/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
	)
	if (!parts) return new Date(isoString)
	const year = parseInt(parts[1], 10)
	const month = parseInt(parts[2], 10) - 1
	const day = parseInt(parts[3], 10)
	const hour = parseInt(parts[4], 10)
	const minute = parseInt(parts[5], 10)
	const second = parts[6] ? parseInt(parts[6], 10) : 0
	// Create a UTC date with the same digits as the wall-clock time
	const naive = new Date(Date.UTC(year, month, day, hour, minute, second))
	// First pass: compute offset at the naive UTC instant
	const offset1 = getTimezoneOffsetMin(naive, timezone)
	const candidate = new Date(naive.getTime() - offset1 * 60000)
	// Second pass: verify offset at the candidate instant (DST safety)
	const offset2 = getTimezoneOffsetMin(candidate, timezone)
	if (offset1 !== offset2) {
		return new Date(naive.getTime() - offset2 * 60000)
	}
	return candidate
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node --test src/__tests__/timezone.test.js
```

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/shared/utils/timezone.js src/__tests__/timezone.test.js
git commit -m "fix(timezone): DST-safe parseWallClockToUtc с double-conversion"
```

---

### Task 8: Fix Telegram timezone fallback (Backend)

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/notificationServices.js:167-173`

- [ ] **Step 1: Use org timezone from `resolveOrgContext` as fallback**

Change lines 167-173 from:

```js
const { name: orgName } = await resolveOrgContext(booking.orgId)
const leadHost = findLeadHost(booking)
const leadHostId = leadHost ? leadHost.userId.toString() : null
const leadTemplate = leadHostId
	? await findCurrentTemplate(
			leadHostId,
			booking.orgId ? booking.orgId.toString() : null,
			null,
		)
	: null
const orgTimezone = leadTemplate ? leadTemplate.timezone : 'Europe/Kyiv'
```

to:

```js
const { name: orgName, timezone: orgTz } = await resolveOrgContext(
	booking.orgId,
)
const leadHost = findLeadHost(booking)
const leadHostId = leadHost ? leadHost.userId.toString() : null
const leadTemplate = leadHostId
	? await findCurrentTemplate(
			leadHostId,
			booking.orgId ? booking.orgId.toString() : null,
			null,
		)
	: null
const orgTimezone = leadTemplate?.timezone ?? orgTz ?? 'UTC'
```

- [ ] **Step 2: Run existing notification tests**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node --test src/services/__tests__/notificationServices.test.js
```

If the test at line 181 expects Kyiv formatting, update it to use the template timezone from mock data (it should already pass since `leadTemplate` is mocked).

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/notificationServices.js
git commit -m "fix(telegram): fallback chain template → org → UTC вместо захардкоженного Europe/Kyiv"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run frontend lint**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted && npm run lint
```

- [ ] **Step 2: Run frontend build**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted && npm run build
```

- [ ] **Step 3: Run backend tests**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node --test src/__tests__/timezone.test.js
```

- [ ] **Step 4: Manual smoke test**

Open booking page in browser:

1. Check calendar defaults to today (not UTC-shifted)
2. Pick a slot, submit booking — check Network tab `startAt` has no `Z`
3. Open staff schedule → Bookings tab — verify grouping by date
4. Open staff schedule → Overrides tab — verify past/future split
