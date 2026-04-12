# Slot List View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "List" view mode to the booking system — users see available time slots as a grid of pill-buttons instead of the calendar, with staff cards in org mode.

**Architecture:** New `SlotListView` container replaces `CalendarCore` when `view === 'list'`. Reuses all existing hooks (`useStaffSchedule`, `useOrgFiltering`, `useBookingActions`, slot engine). New components: `TimeSlotGrid`, `StaffSlotCard`, `BookingConfirmSheet`, `StaffInfoSheet`. ViewMode type extended with `'list'`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Sheet, Button, Avatar), next-intl, react-hook-form + zod (ClientInfoForm reuse)

---

### Task 1: Extend ViewMode type and CalendarViewConfig

**Files:**
- Modify: `lib/calendar/types.ts:4`
- Modify: `lib/calendar/view-config.ts:1-67`

- [ ] **Step 1: Add `'list'` to ViewMode type**

In `lib/calendar/types.ts`, change line 4:

```typescript
type ViewMode = 'day' | 'week' | 'month' | 'list'
```

- [ ] **Step 2: Add `allowListView` to CalendarViewConfig**

In `lib/calendar/view-config.ts`, add `allowListView` to the interface and all configs:

```typescript
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
	allowListView: boolean
}

const ORG_PUBLIC_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'grey',
	columnHeader: 'staff',
	showStaffTabs: true,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: true,
	filterByStaffCapability: true,
	showScheduleEditor: false,
	allowListView: true,
}

const ORG_ADMIN_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'staff',
	showStaffTabs: true,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'open-booking-details',
	canBookForClient: true,
	filterByStaffCapability: true,
	showScheduleEditor: true,
	allowListView: true,
}

const STAFF_PUBLIC_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'grey',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: true,
	filterByStaffCapability: false,
	showScheduleEditor: false,
	allowListView: true,
}

const STAFF_SELF_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'open-booking-details',
	canBookForClient: true,
	filterByStaffCapability: false,
	showScheduleEditor: false,
	allowListView: true,
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build 2>&1 | head -30`

There will be TypeScript errors in `CalendarCore.tsx` because `navigate()` doesn't handle `'list'` — that's expected and will be fixed in Task 3.

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/types.ts lib/calendar/view-config.ts
git commit -m "$(cat <<'EOF'
feat: расширить ViewMode типом 'list' и добавить allowListView в конфиг

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add i18n keys for list view

**Files:**
- Modify: `i18n/messages/en.json` (booking section)
- Modify: `i18n/messages/uk.json` (booking section)

- [ ] **Step 1: Add English translations**

Add these keys under the `"booking"` object in `i18n/messages/en.json`:

```json
"listView": "List",
"calendarView": "Calendar",
"nearestTimeFor": "Nearest available time:",
"noSlotsAvailable": "No available time",
"selectServiceFirst": "Select a service to see available staff",
"aboutStaff": "About specialist",
"confirmBookingTitle": "Confirm booking"
```

- [ ] **Step 2: Add Ukrainian translations**

Add these keys under the `"booking"` object in `i18n/messages/uk.json`:

```json
"listView": "Список",
"calendarView": "Календар",
"nearestTimeFor": "Найближчий час для запису:",
"noSlotsAvailable": "Немає вільного часу",
"selectServiceFirst": "Оберіть послугу, щоб побачити спеціалістів",
"aboutStaff": "Про спеціаліста",
"confirmBookingTitle": "Підтвердження запису"
```

- [ ] **Step 3: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "$(cat <<'EOF'
feat: добавить i18n ключи для режима «Список»

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update CalendarCore — add list/calendar toggle and handle `view === 'list'`

**Files:**
- Modify: `lib/calendar/CalendarCore.tsx:59-65` (VIEW_OPTIONS)
- Modify: `lib/calendar/CalendarCore.tsx:85-89` (navigate function)
- Modify: `lib/calendar/CalendarCore.tsx:746-778` (header render)

- [ ] **Step 1: Update navigate to handle 'list' view**

In `lib/calendar/CalendarCore.tsx`, update the `navigate` function (line 85):

```typescript
const navigate = (view: ViewMode, date: string, direction: number): string => {
	if (view === 'list') return addDays(date, direction)
	if (view === 'month') return addMonths(date, direction)
	if (view === 'week') return addDays(date, direction * 7)
	return addDays(date, direction)
}
```

- [ ] **Step 2: Add list view toggle to header**

Replace the view options rendering section (around lines 746-764). The key changes:
1. Add a "Calendar | List" toggle before the day/week/month buttons
2. Hide day/week/month when view is 'list'
3. Use `allowListView` from viewConfig

Find this block in the render:

```tsx
<div className="flex items-center gap-2">
	{publicUrl && (
		<Button
			variant="outline"
			size="sm"
			onClick={handleCopyPublicLink}
			className="hidden gap-1.5 md:flex"
		>
			{linkCopied ? (
				<CheckIcon className="size-4" />
			) : (
				<LinkIcon className="size-4" />
			)}
			{t('copyPublicLink')}
		</Button>
	)}
	<div className="flex gap-1">
		{VIEW_OPTIONS.map(renderViewOption)}
	</div>
</div>
```

Replace with:

```tsx
<div className="flex items-center gap-2">
	{publicUrl && (
		<Button
			variant="outline"
			size="sm"
			onClick={handleCopyPublicLink}
			className="hidden gap-1.5 md:flex"
		>
			{linkCopied ? (
				<CheckIcon className="size-4" />
			) : (
				<LinkIcon className="size-4" />
			)}
			{t('copyPublicLink')}
		</Button>
	)}
	{viewConfig.allowListView && (
		<div className="flex gap-1 rounded-md border p-0.5">
			<Button
				variant={view !== 'list' ? 'default' : 'ghost'}
				size="xs"
				onClick={() => onViewChange(lastCalendarView === 'list' ? 'day' : lastCalendarView)}
			>
				{t('calendarView')}
			</Button>
			<Button
				variant={view === 'list' ? 'default' : 'ghost'}
				size="xs"
				onClick={() => onViewChange('list')}
			>
				{t('listView')}
			</Button>
		</div>
	)}
	{view !== 'list' && (
		<div className="flex gap-1">
			{VIEW_OPTIONS.map(renderViewOption)}
		</div>
	)}
</div>
```

Add `lastCalendarView` state tracking inside CalendarCore (needs a ref to remember last non-list view):

```typescript
const lastCalendarViewRef = useRef<ViewMode>(view === 'list' ? 'day' : view)
if (view !== 'list') lastCalendarViewRef.current = view
const lastCalendarView = lastCalendarViewRef.current
```

Add `useRef` to the imports if not already there. Also read `viewConfig` from the `useSafeViewConfig()` call that already exists in CalendarCore.

- [ ] **Step 3: Add listViewSlot prop and render**

Add a new prop `listViewSlot` to `CalendarCoreProps`:

```typescript
interface CalendarCoreProps {
	date: string
	view: ViewMode
	onViewChange: (view: ViewMode) => void
	onDateChange: (date: string) => void
	onDayClick?: (date: string) => void
	workStart: string
	workEnd: string
	disabledDays?: number[]
	isDayOff?: boolean
	staffTabsSlot?: React.ReactNode
	columnHeaderSlot?: (dayDate: string, index: number) => React.ReactNode
	publicUrl?: string
	staffAvatarUrl?: string
	hideSidebar?: boolean
	profileInfo?: ProfileInfoBlockProps
	listViewSlot?: React.ReactNode
}
```

Update the render section (around lines 776-778) — add list view rendering:

```tsx
{staffTabsSlot}

{view === 'list' && listViewSlot}
{view === 'day' && renderDayView()}
{view === 'week' && renderWeekView()}
{view === 'month' && renderMonthView()}
```

When `view === 'list'`, the sidebar is hidden (list view has its own layout):

Update the sidebar condition (around line 718-722):

```tsx
{!hideSidebar && view !== 'list' && (
	<aside className="hidden w-[220px] shrink-0 flex-col border-r p-4 md:flex">
		{strategy.renderSidebar()}
	</aside>
)}
```

And mobile sidebar (around line 768-771):

```tsx
{!hideSidebar && view !== 'list' && (
	<div className="md:hidden">
		{strategy.renderMobileSidebar?.() ?? strategy.renderSidebar()}
	</div>
)}
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: Compiles (CalendarCore updated, `listViewSlot` is optional so no breaking changes)

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/CalendarCore.tsx
git commit -m "$(cat <<'EOF'
feat: добавить переключатель Календарь/Список и listViewSlot в CalendarCore

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Create `TimeSlotGrid` component

**Files:**
- Create: `components/booking/TimeSlotGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import type { Slot } from '@/lib/slot-engine'

interface TimeSlotGridProps {
	slots: Slot[]
	selectedSlot: string | null
	onSelect: (time: string) => void
	loading?: boolean
}

const SKELETON_ITEMS = [1, 2, 3, 4, 5, 6]

const renderSkeletonSlot = (i: number) => (
	<Skeleton key={i} className="h-10 rounded-full" />
)

function TimeSlotGrid({
	slots,
	selectedSlot,
	onSelect,
	loading = false,
}: TimeSlotGridProps) {
	const t = useTranslations('booking')

	if (loading) {
		return (
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{SKELETON_ITEMS.map(renderSkeletonSlot)}
			</div>
		)
	}

	if (slots.length === 0) {
		return (
			<p className="text-muted-foreground py-4 text-center text-sm">
				{t('noSlotsAvailable')}
			</p>
		)
	}

	const renderSlot = (slot: Slot) => {
		const isActive = slot.startTime === selectedSlot
		const handleClick = () => onSelect(slot.startTime)

		return (
			<button
				key={slot.startTime}
				type="button"
				onClick={handleClick}
				className={cn(
					'rounded-full border px-4 py-2.5 text-sm font-medium transition-all',
					isActive
						? 'border-primary bg-primary text-primary-foreground shadow-sm'
						: 'border-border bg-muted/50 hover:bg-muted',
				)}
			>
				{slot.startTime}
			</button>
		)
	}

	return (
		<div
			className={cn(
				'grid grid-cols-2 gap-2 sm:grid-cols-3',
				loading && 'pointer-events-none opacity-50',
			)}
		>
			{slots.map(renderSlot)}
		</div>
	)
}

export { TimeSlotGrid }
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -20`
Expected: Compiles (component is standalone, no consumers yet)

- [ ] **Step 3: Commit**

```bash
git add components/booking/TimeSlotGrid.tsx
git commit -m "$(cat <<'EOF'
feat: создать компонент TimeSlotGrid — сетка слотов кнопками-пилюлями

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Create `StaffInfoSheet` component

**Files:**
- Create: `components/booking/StaffInfoSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { InfoIcon } from 'lucide-react'
import { staffApi } from '@/lib/booking-api-client'
import type { StaffBySlugResponse } from '@/services/configs/booking.types'

interface StaffInfoSheetProps {
	staffId: string
	name: string
	avatar: string
	position: string | null
	bio: string | null
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function StaffInfoSheet({
	staffId,
	name,
	avatar,
	position,
	bio,
}: StaffInfoSheetProps) {
	const t = useTranslations('booking')
	const [fullProfile, setFullProfile] = useState<StaffBySlugResponse | null>(
		null,
	)
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open || fullProfile) return

		const loadProfile = async () => {
			try {
				const profile = await staffApi.getById(staffId)
				setFullProfile(profile)
			} catch {
				// Если не удалось загрузить — показываем то что есть
			}
		}
		loadProfile()
	}, [open, staffId, fullProfile])

	const displayBio = fullProfile?.bio ?? bio
	const displayPhone = fullProfile?.phone ?? null
	const displayAddress = fullProfile?.address ?? null
	const displayWebsite = fullProfile?.website ?? null

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon-sm" className="shrink-0">
					<InfoIcon className="size-4" />
				</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{t('aboutStaff')}</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-4 p-4">
					<div className="flex items-center gap-3">
						<Avatar className="size-14">
							<AvatarImage src={avatar} alt={name} />
							<AvatarFallback>{getInitials(name)}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-base font-semibold">{name}</span>
							{position && (
								<span className="text-muted-foreground text-sm">
									{position}
								</span>
							)}
						</div>
					</div>

					{displayBio && (
						<p className="text-muted-foreground text-sm leading-relaxed">
							{displayBio}
						</p>
					)}

					{displayPhone && (
						<a
							href={`tel:${displayPhone}`}
							className="text-primary text-sm hover:underline"
						>
							{displayPhone}
						</a>
					)}

					{displayAddress && (
						<p className="text-muted-foreground text-sm">{displayAddress}</p>
					)}

					{displayWebsite && (
						<a
							href={displayWebsite}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary text-sm hover:underline"
						>
							{displayWebsite}
						</a>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { StaffInfoSheet }
```

- [ ] **Step 2: Verify `staffApi.getById` exists**

Run: `grep -n 'getById' lib/booking-api-client.ts | head -5`

If the method name differs, update the import accordingly. The API should accept a staffId and return `StaffBySlugResponse`.

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add components/booking/StaffInfoSheet.tsx
git commit -m "$(cat <<'EOF'
feat: создать StaffInfoSheet — кнопка «i» с bio и контактами сотрудника

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Create `useFindNearestSlots` hook

**Files:**
- Create: `lib/calendar/hooks/useFindNearestSlots.ts`
- Modify: `lib/calendar/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```typescript
'use client'

import { useMemo } from 'react'
import {
	getAvailableSlots,
	type Slot,
	type SlotBooking,
} from '@/lib/slot-engine'
import {
	getWorkHoursForDate,
	getNowMinForDate,
	addDays,
	formatDateISO,
} from '@/lib/calendar/utils'
import type {
	ScheduleTemplate,
	ScheduleOverride,
	StaffBooking,
} from '@/services/configs/booking.types'
import { timeToMin } from '@/lib/slot-engine'

interface FindNearestSlotsParams {
	schedule: ScheduleTemplate | null
	overrides: ScheduleOverride[]
	bookings: StaffBooking[]
	duration: number
	startDate: string
	fixedDate: boolean
	staffId?: string
}

interface FindNearestSlotsResult {
	date: string
	slots: Slot[]
}

const MAX_SEARCH_DAYS = 14

const toSlotBooking = (booking: StaffBooking): SlotBooking => ({
	startMin: timeToMin(booking.startAt.split('T')[1]?.slice(0, 5) ?? '00:00'),
	duration: booking.durationMin,
})

const normalizeDate = (dateStr: string): string =>
	dateStr.includes('T') ? dateStr.split('T')[0] : dateStr

const filterBookingsByDate =
	(dateStr: string) =>
	(booking: StaffBooking): boolean =>
		normalizeDate(booking.startAt) === dateStr

const getSlotsForDate = (
	dateStr: string,
	schedule: ScheduleTemplate,
	overrides: ScheduleOverride[],
	bookings: StaffBooking[],
	duration: number,
	staffId?: string,
): Slot[] => {
	const workHours = getWorkHoursForDate(
		schedule.weeklyHours,
		dateStr,
		overrides,
		staffId,
	)
	if (!workHours) return []

	const dayBookings = bookings.filter(filterBookingsByDate(dateStr))
	const nowMin = getNowMinForDate(dateStr)

	return getAvailableSlots({
		workStart: workHours.workStart,
		workEnd: workHours.workEnd,
		duration,
		slotStep: schedule.slotStepMin,
		slotMode: schedule.slotMode,
		bookings: dayBookings.map(toSlotBooking),
		minNotice: 0,
		nowMin,
	})
}

const findNearestSlots = (params: FindNearestSlotsParams): FindNearestSlotsResult => {
	const { schedule, overrides, bookings, duration, startDate, fixedDate, staffId } = params

	if (!schedule) return { date: startDate, slots: [] }

	if (fixedDate) {
		const slots = getSlotsForDate(startDate, schedule, overrides, bookings, duration, staffId)
		return { date: startDate, slots }
	}

	const tryDate = (_: unknown, i: number): string =>
		formatDateISO(addDaysToDate(startDate, i))

	const dates = Array.from({ length: MAX_SEARCH_DAYS }, tryDate)

	const findFirstWithSlots = (
		result: FindNearestSlotsResult | null,
		dateStr: string,
	): FindNearestSlotsResult | null => {
		if (result) return result
		const slots = getSlotsForDate(dateStr, schedule, overrides, bookings, duration, staffId)
		return slots.length > 0 ? { date: dateStr, slots } : null
	}

	return dates.reduce(findFirstWithSlots, null) ?? { date: startDate, slots: [] }
}

const addDaysToDate = (dateStr: string, days: number): Date => {
	const date = new Date(dateStr + 'T00:00:00')
	date.setDate(date.getDate() + days)
	return date
}

const useFindNearestSlots = (params: FindNearestSlotsParams): FindNearestSlotsResult => {
	const { schedule, overrides, bookings, duration, startDate, fixedDate, staffId } = params

	return useMemo(
		() => findNearestSlots({ schedule, overrides, bookings, duration, startDate, fixedDate, staffId }),
		[schedule, overrides, bookings, duration, startDate, fixedDate, staffId],
	)
}

export type { FindNearestSlotsParams, FindNearestSlotsResult }
export { useFindNearestSlots }
```

- [ ] **Step 2: Export from hooks index**

Add to `lib/calendar/hooks/index.ts`:

```typescript
export { useFindNearestSlots } from './useFindNearestSlots'
export type { FindNearestSlotsResult } from './useFindNearestSlots'
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -20`

Note: `addDays` from utils returns a string, not Date. The hook uses its own `addDaysToDate` to produce Date objects and then `formatDateISO` to convert back. Verify that `formatDateISO` is imported correctly — it takes a Date and returns `YYYY-MM-DD` string.

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/hooks/useFindNearestSlots.ts lib/calendar/hooks/index.ts
git commit -m "$(cat <<'EOF'
feat: создать хук useFindNearestSlots — поиск ближайшего дня со слотами

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Create `StaffSlotCard` component

**Files:**
- Create: `components/booking/StaffSlotCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TimeSlotGrid } from './TimeSlotGrid'
import { StaffInfoSheet } from './StaffInfoSheet'
import type { Slot } from '@/lib/slot-engine'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface StaffSlotCardProps {
	staff: OrgStaffMember
	slots: Slot[]
	date: string
	selectedSlot: string | null
	selectedStaffId: string | null
	onSlotSelect: (staffId: string, time: string) => void
	loading?: boolean
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

const formatSlotDate = (dateStr: string, locale: string): string => {
	const date = new Date(dateStr + 'T00:00:00')
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const tomorrow = new Date(today)
	tomorrow.setDate(tomorrow.getDate() + 1)

	if (date.getTime() === today.getTime()) {
		return locale === 'uk' ? 'сьогодні' : 'today'
	}
	if (date.getTime() === tomorrow.getTime()) {
		return locale === 'uk' ? 'завтра' : 'tomorrow'
	}

	return date.toLocaleDateString(locale, {
		day: 'numeric',
		month: 'long',
		weekday: 'long',
	})
}

function StaffSlotCard({
	staff,
	slots,
	date,
	selectedSlot,
	selectedStaffId,
	onSlotSelect,
	loading = false,
}: StaffSlotCardProps) {
	const t = useTranslations('booking')
	const locale = useLocale()

	const isThisStaffSelected = selectedStaffId === staff.id
	const activeSlot = isThisStaffSelected ? selectedSlot : null

	const handleSlotSelect = (time: string) => {
		onSlotSelect(staff.id, time)
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Avatar className="size-10">
						<AvatarImage src={staff.avatar} alt={staff.name} />
						<AvatarFallback className="text-xs">
							{getInitials(staff.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="text-sm font-semibold">{staff.name}</span>
						{staff.position && (
							<span className="text-muted-foreground text-xs">
								{staff.position}
							</span>
						)}
					</div>
				</div>
				<StaffInfoSheet
					staffId={staff.id}
					name={staff.name}
					avatar={staff.avatar}
					position={staff.position}
					bio={staff.bio}
				/>
			</div>

			<p className="text-muted-foreground text-sm">
				{t('nearestTimeFor')}{' '}
				<span className="text-foreground font-medium">
					{formatSlotDate(date, locale)}
				</span>
			</p>

			<TimeSlotGrid
				slots={slots}
				selectedSlot={activeSlot}
				onSelect={handleSlotSelect}
				loading={loading}
			/>
		</div>
	)
}

export { StaffSlotCard }
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/booking/StaffSlotCard.tsx
git commit -m "$(cat <<'EOF'
feat: создать StaffSlotCard — карточка сотрудника с сеткой слотов

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Create `BookingConfirmSheet` component

**Files:**
- Create: `components/booking/BookingConfirmSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ClientInfoForm, type ClientInfoData } from './ClientInfoForm'
import type { EventType } from '@/services/configs/booking.types'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'

interface BookingConfirmSheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	eventType: EventType | null
	staffName: string | null
	staffAvatar: string | null
	slotTime: string | null
	slotDate: string | null
	formConfig: MergedBookingForm | null
	onConfirm: (data: ClientInfoData) => void
	isSubmitting: boolean
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function BookingConfirmSheet({
	open,
	onOpenChange,
	eventType,
	staffName,
	staffAvatar,
	slotTime,
	slotDate,
	formConfig,
	onConfirm,
	isSubmitting,
}: BookingConfirmSheetProps) {
	const t = useTranslations('booking')

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{t('confirmBookingTitle')}</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-4 p-4">
					{eventType && (
						<div className="flex items-center gap-3">
							<div
								className="size-3 shrink-0 rounded-full"
								style={{ backgroundColor: eventType.color }}
							/>
							<div className="flex flex-col">
								<span className="text-sm font-medium">{eventType.name}</span>
								<span className="text-muted-foreground text-xs">
									{eventType.durationMin} {t('min')} · {eventType.price}{' '}
									{eventType.currency}
								</span>
							</div>
						</div>
					)}

					{staffName && (
						<div className="flex items-center gap-3">
							<Avatar className="size-8">
								{staffAvatar && (
									<AvatarImage src={staffAvatar} alt={staffName} />
								)}
								<AvatarFallback className="text-xs">
									{getInitials(staffName)}
								</AvatarFallback>
							</Avatar>
							<span className="text-sm font-medium">{staffName}</span>
						</div>
					)}

					{slotTime && slotDate && (
						<Badge variant="outline" className="w-fit text-sm">
							{slotDate} · {slotTime}
						</Badge>
					)}

					<Separator />

					{formConfig && (
						<ClientInfoForm
							formConfig={formConfig}
							onSubmit={onConfirm}
							isSubmitting={isSubmitting}
						/>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { BookingConfirmSheet }
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/booking/BookingConfirmSheet.tsx
git commit -m "$(cat <<'EOF'
feat: создать BookingConfirmSheet — Sheet подтверждения записи из режима Список

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Create `SlotListView` component

**Files:**
- Create: `components/booking/SlotListView.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ServiceList } from './ServiceList'
import { StaffSlotCard } from './StaffSlotCard'
import { TimeSlotGrid } from './TimeSlotGrid'
import { BookingConfirmSheet } from './BookingConfirmSheet'
import { useFindNearestSlots } from '@/lib/calendar/hooks/useFindNearestSlots'
import { Calendar } from '@/components/ui/calendar'
import type { Slot } from '@/lib/slot-engine'
import type {
	EventType,
	OrgStaffMember,
	ScheduleTemplate,
	ScheduleOverride,
	StaffBooking,
} from '@/services/configs/booking.types'
import type { ClientInfoData } from './ClientInfoForm'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'

// ── Types ──

interface SlotListViewProps {
	variant: 'org' | 'personal'
	eventTypes: EventType[]
	selectedEventTypeId: string | null
	onEventTypeSelect: (id: string) => void
	loading?: boolean
	// Personal mode
	schedule?: ScheduleTemplate | null
	overrides?: ScheduleOverride[]
	bookings?: StaffBooking[]
	staffId?: string
	// Org mode
	staff?: OrgStaffMember[]
	getStaffSchedule?: (staffId: string) => ScheduleTemplate | null
	getStaffOverrides?: (staffId: string) => ScheduleOverride[]
	getStaffBookings?: (staffId: string) => StaffBooking[]
	// Booking
	formConfig: MergedBookingForm | null
	onConfirmWithClient: (data: ClientInfoData) => Promise<void>
	isSubmitting: boolean
}

// ── Helpers ──

const findEventType =
	(eventTypes: EventType[]) =>
	(id: string | null): EventType | null =>
		eventTypes.find((et) => et.id === id) ?? null

// ── Subcomponents ──

interface PersonalSlotViewProps {
	schedule: ScheduleTemplate | null
	overrides: ScheduleOverride[]
	bookings: StaffBooking[]
	duration: number
	startDate: string
	fixedDate: boolean
	staffId?: string
	selectedSlot: string | null
	onSlotSelect: (time: string) => void
	loading: boolean
}

function PersonalSlotView({
	schedule,
	overrides,
	bookings,
	duration,
	startDate,
	fixedDate,
	staffId,
	selectedSlot,
	onSlotSelect,
	loading,
}: PersonalSlotViewProps) {
	const result = useFindNearestSlots({
		schedule,
		overrides,
		bookings,
		duration,
		startDate,
		fixedDate,
		staffId,
	})

	return (
		<TimeSlotGrid
			slots={result.slots}
			selectedSlot={selectedSlot}
			onSelect={onSlotSelect}
			loading={loading}
		/>
	)
}

interface OrgStaffSlotItemProps {
	staff: OrgStaffMember
	schedule: ScheduleTemplate | null
	overrides: ScheduleOverride[]
	bookings: StaffBooking[]
	duration: number
	startDate: string
	fixedDate: boolean
	selectedSlot: string | null
	selectedStaffId: string | null
	onSlotSelect: (staffId: string, time: string) => void
	loading: boolean
}

function OrgStaffSlotItem({
	staff,
	schedule,
	overrides,
	bookings,
	duration,
	startDate,
	fixedDate,
	selectedSlot,
	selectedStaffId,
	onSlotSelect,
	loading,
}: OrgStaffSlotItemProps) {
	const result = useFindNearestSlots({
		schedule,
		overrides,
		bookings,
		duration,
		startDate,
		fixedDate,
		staffId: staff.id,
	})

	return (
		<StaffSlotCard
			staff={staff}
			slots={result.slots}
			date={result.date}
			selectedSlot={selectedSlot}
			selectedStaffId={selectedStaffId}
			onSlotSelect={onSlotSelect}
			loading={loading}
		/>
	)
}

// ── Main Component ──

function SlotListView({
	variant,
	eventTypes,
	selectedEventTypeId,
	onEventTypeSelect,
	loading = false,
	schedule = null,
	overrides = [],
	bookings = [],
	staffId,
	staff = [],
	getStaffSchedule,
	getStaffOverrides,
	getStaffBookings,
	formConfig,
	onConfirmWithClient,
	isSubmitting,
}: SlotListViewProps) {
	const t = useTranslations('booking')

	const [selectedDate, setSelectedDate] = useState<string | null>(null)
	const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
	const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
	const [sheetOpen, setSheetOpen] = useState(false)

	const getEventType = findEventType(eventTypes)
	const selectedEventType = getEventType(selectedEventTypeId)
	const duration = selectedEventType?.durationMin ?? 30

	const today = useMemo(() => {
		const d = new Date()
		const pad = (n: number) => String(n).padStart(2, '0')
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
	}, [])

	const startDate = selectedDate ?? today
	const fixedDate = selectedDate !== null

	// ── Slot selection handlers ──

	const handlePersonalSlotSelect = (time: string) => {
		setSelectedSlot(time)
		setSelectedStaffId(staffId ?? null)
		setSheetOpen(true)
	}

	const handleOrgSlotSelect = (orgStaffId: string, time: string) => {
		setSelectedSlot(time)
		setSelectedStaffId(orgStaffId)
		setSheetOpen(true)
	}

	const handleConfirm = async (data: ClientInfoData) => {
		await onConfirmWithClient(data)
		setSheetOpen(false)
		setSelectedSlot(null)
		setSelectedStaffId(null)
	}

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) {
			setSelectedDate(null)
			return
		}
		const pad = (n: number) => String(n).padStart(2, '0')
		const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
		setSelectedDate(dateStr)
		setSelectedSlot(null)
	}

	// ── Find staff member by id ──

	const findStaffById = (id: string | null): OrgStaffMember | null =>
		staff.find((s) => s.id === id) ?? null

	const selectedStaffMember = findStaffById(selectedStaffId)

	// ── Render ──

	const renderOrgStaffItem = (member: OrgStaffMember) => (
		<OrgStaffSlotItem
			key={member.id}
			staff={member}
			schedule={getStaffSchedule?.(member.id) ?? null}
			overrides={getStaffOverrides?.(member.id) ?? []}
			bookings={getStaffBookings?.(member.id) ?? []}
			duration={duration}
			startDate={startDate}
			fixedDate={fixedDate}
			selectedSlot={selectedSlot}
			selectedStaffId={selectedStaffId}
			onSlotSelect={handleOrgSlotSelect}
			loading={loading}
		/>
	)

	return (
		<div className="flex flex-col gap-4">
			<ServiceList
				eventTypes={eventTypes}
				selectedId={selectedEventTypeId}
				onSelect={onEventTypeSelect}
				loading={loading}
				variant="horizontal"
			/>

			{!selectedEventTypeId && variant === 'org' && (
				<p className="text-muted-foreground py-8 text-center text-sm">
					{t('selectServiceFirst')}
				</p>
			)}

			{selectedEventTypeId && (
				<>
					<div className="flex justify-center">
						<Calendar
							mode="single"
							selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined}
							onSelect={handleDateSelect}
							className="rounded-md border"
						/>
					</div>

					{variant === 'personal' && (
						<PersonalSlotView
							schedule={schedule}
							overrides={overrides}
							bookings={bookings}
							duration={duration}
							startDate={startDate}
							fixedDate={fixedDate}
							staffId={staffId}
							selectedSlot={selectedSlot}
							onSlotSelect={handlePersonalSlotSelect}
							loading={loading}
						/>
					)}

					{variant === 'org' && (
						<div className="flex flex-col gap-4">
							{staff.map(renderOrgStaffItem)}
						</div>
					)}
				</>
			)}

			<BookingConfirmSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				eventType={selectedEventType}
				staffName={selectedStaffMember?.name ?? null}
				staffAvatar={selectedStaffMember?.avatar ?? null}
				slotTime={selectedSlot}
				slotDate={startDate}
				formConfig={formConfig}
				onConfirm={handleConfirm}
				isSubmitting={isSubmitting}
			/>
		</div>
	)
}

export { SlotListView }
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add components/booking/SlotListView.tsx
git commit -m "$(cat <<'EOF'
feat: создать SlotListView — контейнер режима «Список» (personal + org)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Integrate SlotListView into BookingPage (personal/staff pages)

**Files:**
- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx`

- [ ] **Step 1: Import SlotListView**

Add import at the top of `BookingPage.tsx`:

```typescript
import { SlotListView } from '@/components/booking/SlotListView'
```

- [ ] **Step 2: Pass listViewSlot to CalendarCore**

In the render section (around line 283), update the CalendarCore usage to pass the `listViewSlot` prop:

```tsx
const listViewSlot = (
	<SlotListView
		variant="personal"
		eventTypes={eventTypes}
		selectedEventTypeId={selectedEventTypeId}
		onEventTypeSelect={onEventTypeSelect}
		loading={loading}
		schedule={scheduleSource}
		overrides={staffOverrides}
		bookings={bookings}
		staffId={staff?.id}
		formConfig={bookingActions.formConfig}
		onConfirmWithClient={bookingActions.handleConfirmWithClient}
		isSubmitting={bookingActions.isSubmitting}
	/>
)

return (
	<CalendarProvider strategy={strategy}>
		<CalendarCore
			date={dateStr}
			view={view}
			onViewChange={navigation.handleViewChange}
			onDateChange={onDateChange}
			onDayClick={onDayClick}
			workStart={workStart}
			workEnd={workEnd}
			isDayOff={isDayOff}
			disabledDays={disabledDays}
			publicUrl={publicUrl}
			staffAvatarUrl={staff?.avatar}
			hideSidebar={hideSidebar}
			profileInfo={profileInfo}
			listViewSlot={listViewSlot}
		/>
	</CalendarProvider>
)
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: Compiles successfully

- [ ] **Step 4: Test manually**

Run: `npm run dev`
Navigate to a staff booking page, verify:
1. "Calendar | List" toggle appears in header
2. Clicking "List" shows ServiceList + time slot grid
3. Clicking a slot opens the confirmation Sheet
4. Switching back to Calendar restores the calendar view

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "$(cat <<'EOF'
feat: интегрировать SlotListView в BookingPage (личные страницы)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Integrate SlotListView into OrgCalendarPage

**Files:**
- Modify: `components/booking/OrgCalendarPage.tsx`

- [ ] **Step 1: Import SlotListView**

Add import:

```typescript
import { SlotListView } from '@/components/booking/SlotListView'
```

- [ ] **Step 2: Create helper functions for staff data access**

Add these functions before the render section in `OrgCalendarPage`:

```typescript
const getStaffScheduleById = (staffId: string): ScheduleTemplate | null =>
	orgSchedules.getStaffSchedule(staffId)

const getStaffOverridesById = (staffId: string): ScheduleOverride[] =>
	orgSchedules.overrides.filter((o) => o.staffId === staffId)

const getStaffBookingsById = (staffId: string): StaffBooking[] =>
	bookings.filter((b) => b.staffId === staffId)
```

Add import for `ScheduleOverride` and `StaffBooking` to the existing imports from `booking.types`:

```typescript
import type {
	ScheduleTemplate,
	ScheduleOverride,
	StaffBooking,
	OrgStaffMember,
} from '@/services/configs/booking.types'
```

- [ ] **Step 3: Build listViewSlot and pass to CalendarCore**

Before the return statement, create the list view slot:

```typescript
const listViewSlot = (
	<SlotListView
		variant="org"
		eventTypes={eventTypes}
		selectedEventTypeId={selectedEventTypeId}
		onEventTypeSelect={onEventTypeSelect}
		loading={contentLoading}
		staff={displayStaff}
		getStaffSchedule={getStaffScheduleById}
		getStaffOverrides={getStaffOverridesById}
		getStaffBookings={getStaffBookingsById}
		formConfig={bookingActions.formConfig}
		onConfirmWithClient={bookingActions.handleConfirmWithClient}
		isSubmitting={bookingActions.isSubmitting}
	/>
)
```

Pass to CalendarCore:

```tsx
<CalendarCore
	date={dateStr}
	view={view}
	onViewChange={navigation.handleViewChange}
	onDateChange={onDateChange}
	onDayClick={onDayClick}
	workStart={workStart}
	workEnd={workEnd}
	disabledDays={disabledDays}
	isDayOff={isOrgDayOff || isStaffDayOff}
	staffTabsSlot={staffTabsSlot}
	publicUrl={publicUrlProp}
	profileInfo={profileInfo}
	listViewSlot={listViewSlot}
/>
```

- [ ] **Step 4: Hide StaffTabs when in list view (org mode handles its own staff display)**

The `staffTabsSlot` is already passed to CalendarCore and rendered inside it. Since CalendarCore now hides the sidebar in list mode, and `staffTabsSlot` is rendered outside the sidebar (line 774), we need to conditionally render it:

In the `staffTabsSlot` computation (around line 308), add view check:

```typescript
const staffTabsSlot =
	viewConfig.showStaffTabs && view !== 'list' ? (
		<StaffTabs
			staff={displayStaff}
			selectedId={selectedStaffId}
			behavior={viewConfig.staffTabBehavior}
			onSelect={onStaffSelect}
			loading={contentLoading}
		/>
	) : null
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 6: Test manually**

Run: `npm run dev`
Navigate to an org booking page, verify:
1. "Calendar | List" toggle appears
2. List mode shows ServiceList → Staff cards with time slots
3. Clicking "i" on a staff card opens info sheet
4. Clicking a slot opens BookingConfirmSheet
5. Submitting the form creates a booking
6. Switching back to Calendar restores normal view

- [ ] **Step 7: Commit**

```bash
git add components/booking/OrgCalendarPage.tsx
git commit -m "$(cat <<'EOF'
feat: интегрировать SlotListView в OrgCalendarPage (org-страницы)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Final verification and lint

**Files:** (no new changes, just verification)

- [ ] **Step 1: Run linter**

Run: `npm run lint 2>&1 | tail -20`
Fix any lint errors that appear.

- [ ] **Step 2: Run format**

Run: `npm run format`

- [ ] **Step 3: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Full manual test — personal page**

1. Open a staff public booking link
2. Toggle to "List" view
3. Select a service → grid of pill-buttons appears
4. Select the date in date picker → slots update
5. Click a slot → BookingConfirmSheet opens
6. Fill in form → booking created
7. Toggle back to "Calendar" → normal calendar with previous view mode restored

- [ ] **Step 5: Full manual test — org page**

1. Open org booking page
2. Toggle to "List" view
3. Select a service → staff cards with slots appear
4. Each staff shows nearest available day and time slots
5. Click "i" → StaffInfoSheet opens with bio/contacts
6. Select date in picker → all staff show slots for that date
7. Click slot → BookingConfirmSheet opens
8. Fill in form → booking created
9. Toggle back to Calendar → normal calendar restored

- [ ] **Step 6: Commit formatting changes (if any)**

```bash
git add -u
git commit -m "$(cat <<'EOF'
style: отформатировать код после интеграции SlotListView

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```
