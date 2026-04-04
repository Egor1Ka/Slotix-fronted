# Personal Schedule Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a personal schedule management page at `/my-schedule` with tabs (Schedule, Days Off, Bookings) and remove the schedule editor button from the BookingPage calendar.

**Architecture:** Reuse existing `StaffScheduleTabs` and child components by making `orgId` optional. Add `showScheduleEditor` flag to view config to conditionally hide the schedule button on BookingPage. New page uses `useUser().id` as staffId.

**Tech Stack:** Next.js App Router, React 19, TypeScript, next-intl, shadcn/ui, sonner

---

### Task 1: Add `showScheduleEditor` to CalendarViewConfig

**Files:**

- Modify: `lib/calendar/view-config.ts`

- [ ] **Step 1: Add field to interface and configs**

In `lib/calendar/view-config.ts`, add `showScheduleEditor: boolean` to the `CalendarViewConfig` interface and set it in each config:

```ts
interface CalendarViewConfig {
	blockedTimeVisibility: 'hidden' | 'grey' | 'full'
	columnHeader: 'date' | 'staff'
	showStaffTabs: boolean
	staffTabBehavior: 'select-one' | 'show-all'
	onEmptyCellClick: 'open-booking-flow' | 'none'
	onBlockClick: 'open-booking-details' | 'none'
	canBookForClient: boolean
	filterByStaffCapability: boolean
	showScheduleEditor: boolean
}
```

Set values:

- `ORG_PUBLIC_CONFIG`: `showScheduleEditor: false`
- `ORG_ADMIN_CONFIG`: `showScheduleEditor: true`
- `STAFF_PUBLIC_CONFIG`: `showScheduleEditor: false`
- `STAFF_SELF_CONFIG`: `showScheduleEditor: false`

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors (all configs now have the new field).

- [ ] **Step 3: Commit**

```bash
git add lib/calendar/view-config.ts
git commit -m "feat: добавить showScheduleEditor в CalendarViewConfig"
```

---

### Task 2: Conditionally render ScheduleSheetButton in staff strategy

**Files:**

- Modify: `lib/calendar/strategies/createStaffStrategy.tsx`

- [ ] **Step 1: Add `showScheduleEditor` to StaffStrategyParams**

In `createStaffStrategy.tsx`, add the optional field to the interface:

```ts
interface StaffStrategyParams {
	// ... existing fields ...
	showScheduleEditor?: boolean
}
```

- [ ] **Step 2: Destructure and use in renderSidebar**

In the `createStaffStrategy` function, destructure `showScheduleEditor` from params (default `false`):

```ts
const createStaffStrategy = (params: StaffStrategyParams): CalendarStrategy => {
	const {
		// ... existing destructuring ...
		showScheduleEditor = false,
	} = params
```

In `renderSidebar()`, wrap `ScheduleSheetButton` in a condition:

```tsx
renderSidebar() {
	return (
		<>
			<ServiceList
				eventTypes={eventTypes}
				selectedId={selectedEventTypeId}
				onSelect={onSelectEventType}
			/>
			<Separator className="my-4" />
			<SlotModeSelector value={slotMode} onChange={onModeChange} />
			{showScheduleEditor && (
				<>
					<Separator className="my-4" />
					<ScheduleSheetButton
						schedule={schedule}
						onSaveSchedule={onSaveSchedule}
						onSaveOverride={onSaveOverride}
					/>
				</>
			)}
		</>
	)
},
```

- [ ] **Step 3: Pass flag from BookingPage**

In `app/[locale]/book/[staffSlug]/BookingPage.tsx`, where `createStaffStrategy` is called (~line 259), add the `showScheduleEditor` param. The BookingPage is wrapped in `CalendarViewConfigProvider`, so import `useViewConfig` and pass the flag:

Add import at top of BookingPage.tsx:

```ts
import { useViewConfig } from '@/lib/calendar/CalendarViewConfigContext'
```

Inside the component, get the config:

```ts
const viewConfig = useViewConfig()
```

Add to createStaffStrategy call:

```ts
createStaffStrategy({
	// ... existing params ...
	showScheduleEditor: viewConfig.showScheduleEditor,
})
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/strategies/createStaffStrategy.tsx app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "feat: условный рендер ScheduleSheetButton по флагу showScheduleEditor"
```

---

### Task 3: Make orgId optional in StaffScheduleTabs

**Files:**

- Modify: `components/staff-schedule/StaffScheduleTabs.tsx`

- [ ] **Step 1: Change interface**

Change the props interface:

```ts
interface StaffScheduleTabsProps {
	staffId: string
	orgId?: string
	readOnly: boolean
}
```

No other changes needed — orgId is passed through to child components which will be updated in the next tasks.

- [ ] **Step 2: Commit**

```bash
git add components/staff-schedule/StaffScheduleTabs.tsx
git commit -m "refactor: сделать orgId optional в StaffScheduleTabs"
```

---

### Task 4: Make orgId optional in ScheduleViewTab

**Files:**

- Modify: `components/staff-schedule/ScheduleViewTab.tsx`

- [ ] **Step 1: Change interface and update handleSave**

Change the props interface:

```ts
interface ScheduleViewTabProps {
	staffId: string
	orgId?: string
	readOnly: boolean
}
```

In `handleSave`, pass `orgId ?? null` to `updateTemplate`:

```ts
const handleSave = async (weeklyHours: WeeklyHours[]) => {
	try {
		await scheduleApi.updateTemplate(staffId, orgId ?? null, weeklyHours)
		await fetchSchedule()
		toast.success(t('scheduleSaved'))
	} catch (err) {
		const message = err instanceof Error ? err.message : t('scheduleSaveError')
		toast.error(message)
		throw err
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add components/staff-schedule/ScheduleViewTab.tsx
git commit -m "refactor: сделать orgId optional в ScheduleViewTab"
```

---

### Task 5: Make orgId optional in OverridesTab

**Files:**

- Modify: `components/staff-schedule/OverridesTab.tsx`

- [ ] **Step 1: Change interface**

Change the props interface:

```ts
interface OverridesTabProps {
	staffId: string
	orgId?: string
	readOnly: boolean
}
```

No other changes needed — `scheduleApi.getOverrides(staffId, orgId)` already handles undefined orgId, and `ScheduleOverrideForm` already accepts `orgId?: string`.

- [ ] **Step 2: Commit**

```bash
git add components/staff-schedule/OverridesTab.tsx
git commit -m "refactor: сделать orgId optional в OverridesTab"
```

---

### Task 6: Make orgId optional in BookingsTab with eventType fallback

**Files:**

- Modify: `components/staff-schedule/BookingsTab.tsx`

- [ ] **Step 1: Change interface**

```ts
interface BookingsTabProps {
	staffId: string
	orgId?: string
	readOnly: boolean
}
```

- [ ] **Step 2: Add eventTypeApi.getByStaff fallback**

In the `fetchData` callback, replace the eventTypes fetching logic:

```ts
const fetchData = useCallback(async () => {
	setLoading(true)
	try {
		const { dateFrom, dateTo } = getWeekRange(weekOffset)

		const fetchEventTypes = orgId
			? () => eventTypeApi.getByOrg(orgId)
			: () => eventTypeApi.getByStaff(staffId)

		const types = eventTypes.length > 0 ? eventTypes : await fetchEventTypes()

		if (eventTypes.length === 0) {
			setEventTypes(types)
		}

		const data = await bookingApi.getByStaff(staffId, dateFrom, dateTo, types)
		setBookings(data)
	} catch {
		// обрабатывается интерцептором toast
	} finally {
		setLoading(false)
	}
}, [staffId, orgId, weekOffset, eventTypes])
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/staff-schedule/BookingsTab.tsx
git commit -m "refactor: сделать orgId optional в BookingsTab, fallback на getByStaff"
```

---

### Task 7: Add translations

**Files:**

- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Add sidebar translation keys**

In `i18n/messages/en.json`, inside the `"sidebar"` object, add:

```json
"myScheduleSettings": "Schedule Settings"
```

In `i18n/messages/uk.json`, inside the `"sidebar"` object, add:

```json
"myScheduleSettings": "Налаштування розкладу"
```

- [ ] **Step 2: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "i18n: добавить перевод для пункта меню налаштування розкладу"
```

---

### Task 8: Add link to PersonalSidebar

**Files:**

- Modify: `components/sidebar/PersonalSidebar.tsx`

- [ ] **Step 1: Add import and menu item**

Add `CalendarCog` to the lucide-react import:

```ts
import { Building2, Calendar, CalendarCog } from 'lucide-react'
```

Add `myScheduleHref`:

```ts
const scheduleHref = buildHref('/schedule')
const myScheduleHref = buildHref('/my-schedule')
const orgsHref = buildHref('/organizations')
```

Add the new menu item after the existing "Мій розклад" item and before "Мої організації":

```tsx
<SidebarMenuItem>
	<SidebarMenuButton
		render={<Link href={myScheduleHref} />}
		isActive={isActive(myScheduleHref)}
	>
		<CalendarCog className="size-4" />
		<span>{t('myScheduleSettings')}</span>
	</SidebarMenuButton>
</SidebarMenuItem>
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/sidebar/PersonalSidebar.tsx
git commit -m "feat: добавить ссылку на налаштування розкладу в PersonalSidebar"
```

---

### Task 9: Create personal schedule page

**Files:**

- Create: `app/[locale]/(personal)/my-schedule/page.tsx`

- [ ] **Step 1: Create the page component**

Create `app/[locale]/(personal)/my-schedule/page.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'
import { StaffScheduleTabs } from '@/components/staff-schedule/StaffScheduleTabs'
import { useUser } from '@/lib/auth/user-provider'

export default function PersonalMySchedulePage() {
	const user = useUser()
	const t = useTranslations('staffSchedule')

	return (
		<div className="max-w-3xl space-y-6 px-4 py-6">
			<h1 className="text-lg font-semibold">{t('mySchedule')}</h1>
			<Separator />
			<StaffScheduleTabs staffId={user.id} readOnly={false} />
		</div>
	)
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(personal)/my-schedule/page.tsx
git commit -m "feat: создать страницу личного расписания /my-schedule"
```

---

### Task 10: Visual verification

- [ ] **Step 1: Start dev server and verify**

Run: `npm run dev`

Check in browser:

1. Navigate to `/schedule` — verify **ScheduleSheetButton is gone** from the left sidebar (no gear/settings icon for schedule)
2. Navigate to `/my-schedule` — verify 3 tabs appear: Schedule, Days Off, Bookings
3. On Schedule tab — verify weekly schedule editor loads and save works
4. On Days Off tab — verify override form appears and creating/deleting works
5. On Bookings tab — verify bookings load for the current week
6. Check PersonalSidebar — verify "Налаштування розкладу" link appears and navigates to `/my-schedule`

- [ ] **Step 2: Verify org version still works**

Navigate to `/org/[orgId]/my-schedule` — verify all 3 tabs still work correctly with orgId.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors.
