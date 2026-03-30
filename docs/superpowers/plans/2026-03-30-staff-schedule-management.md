# Staff Schedule Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two pages for managing staff schedules in org context — editable for staff, readonly for admin with staff filter and 3 tabs (Schedule, Overrides, Bookings).

**Architecture:** Shared tab components in `components/staff-schedule/` accept `staffId`, `orgId`, `readOnly`. Staff page at `/(org)/org/[orgId]/my-schedule`, admin page at `/(org)/manage/[orgId]/staff-schedule`. Both reuse existing `ScheduleEditor`, `ScheduleOverrideForm`, `BookingDetailsPanel`. New API methods for overrides list/delete in `lib/booking-api-client.ts`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, shadcn/ui (Tabs, Sheet, Badge, Select, Empty), next-intl, react-hook-form + zod (existing forms), Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-03-30-staff-schedule-management-design.md`

---

## File Structure

```
# Новые файлы
components/staff-schedule/ScheduleViewTab.tsx    — Таб расписания (ScheduleEditor wrapper + readonly вид)
components/staff-schedule/OverridesTab.tsx        — Таб выходных (список + форма создания)
components/staff-schedule/OverrideListItem.tsx    — Элемент списка overrides
components/staff-schedule/BookingsTab.tsx          — Таб букингов (группировка по датам + Sheet)
components/staff-schedule/BookingDateGroup.tsx     — Группа букингов за дату
components/staff-schedule/BookingListItem.tsx      — Элемент списка букингов
components/staff-schedule/StaffFilter.tsx          — Combobox выбора сотрудника (для админа)
components/staff-schedule/StaffScheduleTabs.tsx    — Обёртка с 3 табами
app/[locale]/(org)/org/[orgId]/my-schedule/page.tsx         — Страница сотрудника
app/[locale]/(org)/manage/[orgId]/staff-schedule/page.tsx   — Админская страница

# Модифицируемые файлы
lib/booking-api-client.ts              — Добавить getOverrides, deleteOverride
services/configs/booking.types.ts      — Нет изменений (ScheduleOverride уже есть)
components/sidebar/OrgSidebar.tsx       — Добавить пункт "Staff Schedule"
i18n/messages/en.json                  — Добавить переводы для staff-schedule
i18n/messages/uk.json                  — Добавить переводы для staff-schedule
```

---

### Task 1: API — добавить методы для overrides

**Files:**
- Modify: `lib/booking-api-client.ts`

- [ ] **Step 1: Добавить getOverrides в Schedule API**

В `lib/booking-api-client.ts` перед секцией `// ── Booking API ──` добавить функцию получения списка overrides:

```ts
const getScheduleOverrides = async (
	staffId: string,
): Promise<ScheduleOverride[]> =>
	get<ScheduleOverride[]>(`/schedule/overrides?staffId=${staffId}`)
```

- [ ] **Step 2: Добавить deleteOverride в Schedule API**

В `lib/booking-api-client.ts` после `getScheduleOverrides` добавить:

```ts
const deleteScheduleOverride = async (
	overrideId: string,
): Promise<void> => {
	await del<void>(`/schedule/override/${overrideId}`)
}
```

- [ ] **Step 3: Экспортировать в scheduleApi**

В объект экспорта `scheduleApi` добавить новые методы:

```ts
export const scheduleApi = {
	getTemplate: getScheduleTemplate,
	getByOrg: getSchedulesByOrg,
	updateTemplate: updateScheduleTemplate,
	createOverride: createScheduleOverride,
	getOverrides: getScheduleOverrides,
	deleteOverride: deleteScheduleOverride,
}
```

- [ ] **Step 4: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to booking-api-client.ts

- [ ] **Step 5: Commit**

```bash
git add lib/booking-api-client.ts
git commit -m "feat(schedule): добавить API методы getOverrides и deleteOverride"
```

---

### Task 2: i18n — добавить переводы

**Files:**
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Добавить секцию staffSchedule в en.json**

Добавить новый ключ верхнего уровня `"staffSchedule"` в `en.json`:

```json
"staffSchedule": {
	"mySchedule": "My Schedule",
	"staffSchedule": "Staff Schedule",
	"scheduleTab": "Schedule",
	"overridesTab": "Days Off",
	"bookingsTab": "Bookings",
	"selectStaff": "Select a staff member",
	"selectStaffDescription": "Choose a staff member to view their schedule",
	"noOverrides": "No days off",
	"futureOverrides": "Upcoming",
	"pastOverrides": "Past",
	"addOverride": "Add day off",
	"deleteOverride": "Delete",
	"deleteOverrideConfirm": "Are you sure you want to delete this day off?",
	"dayOff": "Day off",
	"customHours": "Custom hours",
	"noBookings": "No bookings",
	"prevWeek": "Previous week",
	"nextWeek": "Next week",
	"bookingDetails": "Booking Details"
}
```

- [ ] **Step 2: Добавить sidebar.staffSchedule в en.json**

В секцию `"sidebar"` добавить:

```json
"staffSchedule": "Staff Schedule"
```

- [ ] **Step 3: Добавить секцию staffSchedule в uk.json**

```json
"staffSchedule": {
	"mySchedule": "Мій розклад",
	"staffSchedule": "Розклад співробітників",
	"scheduleTab": "Розклад",
	"overridesTab": "Вихідні",
	"bookingsTab": "Букінги",
	"selectStaff": "Оберіть співробітника",
	"selectStaffDescription": "Оберіть співробітника для перегляду розкладу",
	"noOverrides": "Немає вихідних",
	"futureOverrides": "Майбутні",
	"pastOverrides": "Минулі",
	"addOverride": "Додати вихідний",
	"deleteOverride": "Видалити",
	"deleteOverrideConfirm": "Ви впевнені, що хочете видалити цей вихідний?",
	"dayOff": "Вихідний",
	"customHours": "Особливий графік",
	"noBookings": "Немає букінгів",
	"prevWeek": "Попередній тиждень",
	"nextWeek": "Наступний тиждень",
	"bookingDetails": "Деталі букінгу"
}
```

- [ ] **Step 4: Добавить sidebar.staffSchedule в uk.json**

В секцию `"sidebar"` добавить:

```json
"staffSchedule": "Розклад співробітників"
```

- [ ] **Step 5: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "i18n: добавить переводы для управления расписанием сотрудников"
```

---

### Task 3: OverrideListItem — элемент списка overrides

**Files:**
- Create: `components/staff-schedule/OverrideListItem.tsx`

- [ ] **Step 1: Создать компонент OverrideListItem**

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ScheduleOverride } from '@/services/configs/booking.types'

interface OverrideListItemProps {
	override: ScheduleOverride
	readOnly: boolean
	isPast: boolean
	onDelete: (id: string) => Promise<void>
}

const formatDate = (dateStr: string): string =>
	new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})

const formatSlots = (slots: { start: string; end: string }[]): string =>
	slots.map((s) => `${s.start} — ${s.end}`).join(', ')

function OverrideListItem({ override, readOnly, isPast, onDelete }: OverrideListItemProps) {
	const t = useTranslations('staffSchedule')
	const [isDeleting, setIsDeleting] = useState(false)

	const handleDelete = async () => {
		setIsDeleting(true)
		await onDelete(override.id)
		setIsDeleting(false)
	}

	const label = override.enabled ? t('customHours') : t('dayOff')
	const variant = override.enabled ? 'secondary' : 'destructive'

	return (
		<div className="flex items-center justify-between rounded-lg border p-3">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{formatDate(override.date)}</span>
					<Badge variant={variant}>{label}</Badge>
				</div>
				{override.enabled && override.slots.length > 0 && (
					<span className="text-muted-foreground text-xs">
						{formatSlots(override.slots)}
					</span>
				)}
				{override.reason && (
					<span className="text-muted-foreground text-xs italic">
						{override.reason}
					</span>
				)}
			</div>
			{!readOnly && !isPast && (
				<Button
					variant="ghost"
					size="sm"
					onClick={handleDelete}
					disabled={isDeleting}
				>
					<Trash2 className="size-4" />
				</Button>
			)}
		</div>
	)
}

export { OverrideListItem }
```

- [ ] **Step 2: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to OverrideListItem

- [ ] **Step 3: Commit**

```bash
git add components/staff-schedule/OverrideListItem.tsx
git commit -m "feat(staff-schedule): добавить компонент OverrideListItem"
```

---

### Task 4: OverridesTab — таб выходных

**Files:**
- Create: `components/staff-schedule/OverridesTab.tsx`

- [ ] **Step 1: Создать компонент OverridesTab**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { ScheduleOverrideForm } from '@/components/booking/ScheduleOverrideForm'
import { OverrideListItem } from './OverrideListItem'
import { scheduleApi } from '@/lib/booking-api-client'
import type { ScheduleOverride, CreateScheduleOverrideBody } from '@/services/configs/booking.types'

interface OverridesTabProps {
	staffId: string
	orgId: string
	readOnly: boolean
}

const isDatePast = (dateStr: string): boolean =>
	new Date(dateStr + 'T23:59:59') < new Date()

const sortByDate = (a: ScheduleOverride, b: ScheduleOverride): number =>
	new Date(a.date).getTime() - new Date(b.date).getTime()

const sortByDateDesc = (a: ScheduleOverride, b: ScheduleOverride): number =>
	new Date(b.date).getTime() - new Date(a.date).getTime()

function OverridesTab({ staffId, orgId, readOnly }: OverridesTabProps) {
	const t = useTranslations('staffSchedule')
	const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
	const [loading, setLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)

	const fetchOverrides = useCallback(async () => {
		setLoading(true)
		try {
			const data = await scheduleApi.getOverrides(staffId)
			setOverrides(data)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setLoading(false)
		}
	}, [staffId])

	useEffect(() => {
		fetchOverrides()
	}, [fetchOverrides])

	const handleSave = async (body: CreateScheduleOverrideBody) => {
		await scheduleApi.createOverride(body)
		setShowForm(false)
		await fetchOverrides()
	}

	const handleDelete = async (id: string) => {
		await scheduleApi.deleteOverride(id)
		await fetchOverrides()
	}

	const toggleForm = () => setShowForm((prev) => !prev)

	if (loading) {
		return (
			<div className="flex justify-center py-8">
				<Spinner />
			</div>
		)
	}

	const futureOverrides = overrides
		.filter((o) => !isDatePast(o.date))
		.sort(sortByDate)

	const pastOverrides = overrides
		.filter((o) => isDatePast(o.date))
		.sort(sortByDateDesc)

	const renderOverrideItem = (isPast: boolean) => (override: ScheduleOverride) => (
		<OverrideListItem
			key={override.id}
			override={override}
			readOnly={readOnly}
			isPast={isPast}
			onDelete={handleDelete}
		/>
	)

	const hasNoOverrides = futureOverrides.length === 0 && pastOverrides.length === 0

	return (
		<div className="flex flex-col gap-4">
			{!readOnly && (
				<div className="flex justify-end">
					<Button variant="outline" size="sm" onClick={toggleForm}>
						<Plus className="mr-1 size-4" />
						{t('addOverride')}
					</Button>
				</div>
			)}

			{!readOnly && showForm && (
				<>
					<ScheduleOverrideForm staffId={staffId} onSave={handleSave} />
					<Separator />
				</>
			)}

			{hasNoOverrides && (
				<Empty>{t('noOverrides')}</Empty>
			)}

			{futureOverrides.length > 0 && (
				<div className="flex flex-col gap-2">
					<h4 className="text-muted-foreground text-xs font-semibold uppercase">
						{t('futureOverrides')}
					</h4>
					{futureOverrides.map(renderOverrideItem(false))}
				</div>
			)}

			{pastOverrides.length > 0 && (
				<div className="flex flex-col gap-2">
					<h4 className="text-muted-foreground text-xs font-semibold uppercase">
						{t('pastOverrides')}
					</h4>
					{pastOverrides.map(renderOverrideItem(true))}
				</div>
			)}
		</div>
	)
}

export { OverridesTab }
```

- [ ] **Step 2: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/staff-schedule/OverridesTab.tsx
git commit -m "feat(staff-schedule): добавить компонент OverridesTab"
```

---

### Task 5: ScheduleViewTab — таб расписания

**Files:**
- Create: `components/staff-schedule/ScheduleViewTab.tsx`

- [ ] **Step 1: Создать компонент ScheduleViewTab**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { ScheduleEditor } from '@/components/booking/ScheduleEditor'
import { getCalendarLocale } from '@/lib/calendar/utils'
import { scheduleApi } from '@/lib/booking-api-client'
import type { ScheduleTemplate, WeeklyHours } from '@/services/configs/booking.types'

interface ScheduleViewTabProps {
	staffId: string
	orgId: string
	readOnly: boolean
}

const formatSlots = (slots: { start: string; end: string }[]): string =>
	slots.map((s) => `${s.start} — ${s.end}`).join(', ')

function ReadOnlySchedule({ schedule }: { schedule: ScheduleTemplate }) {
	const locale = useLocale()
	const calendarLocale = getCalendarLocale(locale)

	const renderDay = (day: WeeklyHours) => {
		const dayName = calendarLocale.daysLong[day.dayOfWeek]

		return (
			<div key={day.dayOfWeek} className="flex items-center justify-between py-2">
				<span className="text-sm font-medium">{dayName}</span>
				{day.enabled ? (
					<span className="text-sm">{formatSlots(day.slots)}</span>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				)}
			</div>
		)
	}

	return (
		<div className="flex flex-col">
			{schedule.weeklyHours.map((day, index) => (
				<div key={day.dayOfWeek}>
					{renderDay(day)}
					{index < schedule.weeklyHours.length - 1 && <Separator />}
				</div>
			))}
		</div>
	)
}

function ScheduleViewTab({ staffId, orgId, readOnly }: ScheduleViewTabProps) {
	const t = useTranslations('booking')
	const [schedule, setSchedule] = useState<ScheduleTemplate | null>(null)
	const [loading, setLoading] = useState(true)

	const fetchSchedule = useCallback(async () => {
		setLoading(true)
		try {
			const data = await scheduleApi.getTemplate(staffId)
			setSchedule(data)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setLoading(false)
		}
	}, [staffId])

	useEffect(() => {
		fetchSchedule()
	}, [fetchSchedule])

	const handleSave = async (weeklyHours: WeeklyHours[]) => {
		await scheduleApi.updateTemplate(staffId, orgId, weeklyHours)
		await fetchSchedule()
	}

	if (loading) {
		return (
			<div className="flex justify-center py-8">
				<Spinner />
			</div>
		)
	}

	if (!schedule) return null

	if (readOnly) {
		return <ReadOnlySchedule schedule={schedule} />
	}

	return <ScheduleEditor schedule={schedule} onSave={handleSave} />
}

export { ScheduleViewTab }
```

- [ ] **Step 2: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/staff-schedule/ScheduleViewTab.tsx
git commit -m "feat(staff-schedule): добавить компонент ScheduleViewTab"
```

---

### Task 6: BookingListItem — элемент списка букингов

**Files:**
- Create: `components/staff-schedule/BookingListItem.tsx`

- [ ] **Step 1: Создать компонент BookingListItem**

```tsx
'use client'

import { Badge } from '@/components/ui/badge'
import type { StaffBooking, BookingStatus } from '@/services/configs/booking.types'

interface BookingListItemProps {
	booking: StaffBooking
	onClick: (booking: StaffBooking) => void
}

const STATUS_VARIANT: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	confirmed: 'default',
	pending_payment: 'secondary',
	completed: 'outline',
	no_show: 'secondary',
	cancelled: 'destructive',
}

const formatTime = (isoString: string): string =>
	new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function BookingListItem({ booking, onClick }: BookingListItemProps) {
	const handleClick = () => onClick(booking)

	return (
		<button
			type="button"
			onClick={handleClick}
			className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors"
		>
			<div className="flex items-center gap-3">
				<div
					className="size-2 shrink-0 rounded-full"
					style={{ backgroundColor: booking.color }}
				/>
				<div className="flex flex-col">
					<span className="text-sm font-medium">
						{formatTime(booking.startAt)} — {formatTime(booking.endAt)}
					</span>
					<span className="text-muted-foreground text-xs">
						{booking.eventTypeName}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-xs">{booking.invitee.name}</span>
				<Badge variant={STATUS_VARIANT[booking.status]} className="text-[10px]">
					{booking.status}
				</Badge>
			</div>
		</button>
	)
}

export { BookingListItem }
```

- [ ] **Step 2: Commit**

```bash
git add components/staff-schedule/BookingListItem.tsx
git commit -m "feat(staff-schedule): добавить компонент BookingListItem"
```

---

### Task 7: BookingDateGroup — группа букингов за дату

**Files:**
- Create: `components/staff-schedule/BookingDateGroup.tsx`

- [ ] **Step 1: Создать компонент BookingDateGroup**

```tsx
'use client'

import { BookingListItem } from './BookingListItem'
import type { StaffBooking } from '@/services/configs/booking.types'

interface BookingDateGroupProps {
	date: string
	bookings: StaffBooking[]
	onBookingClick: (booking: StaffBooking) => void
}

const formatDateHeader = (dateStr: string): string =>
	new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	})

function BookingDateGroup({ date, bookings, onBookingClick }: BookingDateGroupProps) {
	const renderItem = (booking: StaffBooking) => (
		<BookingListItem
			key={booking.id}
			booking={booking}
			onClick={onBookingClick}
		/>
	)

	return (
		<div className="flex flex-col gap-2">
			<h4 className="text-muted-foreground sticky top-0 bg-background py-1 text-xs font-semibold uppercase">
				{formatDateHeader(date)}
			</h4>
			<div className="flex flex-col gap-1">
				{bookings.map(renderItem)}
			</div>
		</div>
	)
}

export { BookingDateGroup }
```

- [ ] **Step 2: Commit**

```bash
git add components/staff-schedule/BookingDateGroup.tsx
git commit -m "feat(staff-schedule): добавить компонент BookingDateGroup"
```

---

### Task 8: BookingsTab — таб букингов

**Files:**
- Create: `components/staff-schedule/BookingsTab.tsx`

- [ ] **Step 1: Создать компонент BookingsTab**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { BookingDateGroup } from './BookingDateGroup'
import { BookingDetailPanel } from '@/components/booking/BookingDetailPanel'
import { bookingApi, eventTypeApi } from '@/lib/booking-api-client'
import type { StaffBooking, EventType } from '@/services/configs/booking.types'
import type { BookingDetail } from '@/components/booking/BookingDetailPanel'

interface BookingsTabProps {
	staffId: string
	orgId: string
	readOnly: boolean
}

const getWeekRange = (offset: number): { dateFrom: string; dateTo: string } => {
	const now = new Date()
	const monday = new Date(now)
	monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
	const sunday = new Date(monday)
	sunday.setDate(monday.getDate() + 6)

	const toISODate = (d: Date): string => d.toISOString().split('T')[0]

	return { dateFrom: toISODate(monday), dateTo: toISODate(sunday) }
}

const extractDate = (isoString: string): string =>
	isoString.split('T')[0]

const groupByDate = (bookings: StaffBooking[]): Map<string, StaffBooking[]> => {
	const groups = new Map<string, StaffBooking[]>()

	const addToGroup = (booking: StaffBooking) => {
		const date = extractDate(booking.startAt)
		const existing = groups.get(date) ?? []
		groups.set(date, [...existing, booking])
	}

	bookings.forEach(addToGroup)
	return groups
}

const sortDatesAsc = (a: string, b: string): number =>
	a.localeCompare(b)

function BookingsTab({ staffId, orgId, readOnly }: BookingsTabProps) {
	const t = useTranslations('staffSchedule')
	const [bookings, setBookings] = useState<StaffBooking[]>([])
	const [eventTypes, setEventTypes] = useState<EventType[]>([])
	const [loading, setLoading] = useState(true)
	const [weekOffset, setWeekOffset] = useState(0)
	const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		try {
			const { dateFrom, dateTo } = getWeekRange(weekOffset)

			const types = eventTypes.length > 0
				? eventTypes
				: await eventTypeApi.getByOrg(orgId)

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

	useEffect(() => {
		fetchData()
	}, [fetchData])

	const handlePrevWeek = () => setWeekOffset((prev) => prev - 1)
	const handleNextWeek = () => setWeekOffset((prev) => prev + 1)

	const handleBookingClick = (booking: StaffBooking) => setSelectedBooking(booking)
	const handleCloseSheet = () => setSelectedBooking(null)

	const { dateFrom, dateTo } = getWeekRange(weekOffset)
	const grouped = groupByDate(bookings)
	const sortedDates = [...grouped.keys()].sort(sortDatesAsc)

	const formatWeekLabel = (from: string, to: string): string => {
		const formatShort = (d: string) =>
			new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
		return `${formatShort(from)} — ${formatShort(to)}`
	}

	const toBookingDetail = (booking: StaffBooking): BookingDetail => ({
		id: booking.id,
		eventTypeName: booking.eventTypeName,
		color: booking.color,
		startAt: booking.startAt,
		endAt: booking.endAt,
		durationMin: Math.round(
			(new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 60000,
		),
		date: extractDate(booking.startAt),
		status: booking.status,
		invitee: {
			name: booking.invitee.name,
			email: booking.invitee.email,
			phone: booking.invitee.phone,
		},
		payment: { status: 'unknown', amount: 0, currency: '' },
	})

	const handleStatusChange = () => {
		setSelectedBooking(null)
		fetchData()
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<Button variant="ghost" size="sm" onClick={handlePrevWeek}>
					<ChevronLeft className="mr-1 size-4" />
					{t('prevWeek')}
				</Button>
				<span className="text-muted-foreground text-sm font-medium">
					{formatWeekLabel(dateFrom, dateTo)}
				</span>
				<Button variant="ghost" size="sm" onClick={handleNextWeek}>
					{t('nextWeek')}
					<ChevronRight className="ml-1 size-4" />
				</Button>
			</div>

			{loading ? (
				<div className="flex justify-center py-8">
					<Spinner />
				</div>
			) : sortedDates.length === 0 ? (
				<Empty>{t('noBookings')}</Empty>
			) : (
				<div className="flex flex-col gap-4">
					{sortedDates.map((date) => (
						<BookingDateGroup
							key={date}
							date={date}
							bookings={grouped.get(date) ?? []}
							onBookingClick={handleBookingClick}
						/>
					))}
				</div>
			)}

			<Sheet open={selectedBooking !== null} onOpenChange={handleCloseSheet}>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>{t('bookingDetails')}</SheetTitle>
					</SheetHeader>
					{selectedBooking && (
						<BookingDetailPanel
							booking={toBookingDetail(selectedBooking)}
							onClose={handleCloseSheet}
							onStatusChange={handleStatusChange}
						/>
					)}
				</SheetContent>
			</Sheet>
		</div>
	)
}

export { BookingsTab }
```

- [ ] **Step 2: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/staff-schedule/BookingsTab.tsx
git commit -m "feat(staff-schedule): добавить компонент BookingsTab"
```

---

### Task 9: StaffScheduleTabs — обёртка с 3 табами

**Files:**
- Create: `components/staff-schedule/StaffScheduleTabs.tsx`

- [ ] **Step 1: Создать компонент StaffScheduleTabs**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScheduleViewTab } from './ScheduleViewTab'
import { OverridesTab } from './OverridesTab'
import { BookingsTab } from './BookingsTab'

interface StaffScheduleTabsProps {
	staffId: string
	orgId: string
	readOnly: boolean
}

const TAB_VALUES = ['schedule', 'overrides', 'bookings'] as const
type TabValue = (typeof TAB_VALUES)[number]

const isValidTab = (value: string | null): value is TabValue =>
	TAB_VALUES.includes(value as TabValue)

function StaffScheduleTabs({ staffId, orgId, readOnly }: StaffScheduleTabsProps) {
	const t = useTranslations('staffSchedule')
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()

	const tabParam = searchParams.get('tab')
	const activeTab: TabValue = isValidTab(tabParam) ? tabParam : 'schedule'

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString())
		params.set('tab', value)
		router.replace(`${pathname}?${params.toString()}`)
	}

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange}>
			<TabsList className="w-full">
				<TabsTrigger value="schedule" className="flex-1">
					{t('scheduleTab')}
				</TabsTrigger>
				<TabsTrigger value="overrides" className="flex-1">
					{t('overridesTab')}
				</TabsTrigger>
				<TabsTrigger value="bookings" className="flex-1">
					{t('bookingsTab')}
				</TabsTrigger>
			</TabsList>
			<TabsContent value="schedule">
				<ScheduleViewTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="overrides">
				<OverridesTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="bookings">
				<BookingsTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
		</Tabs>
	)
}

export { StaffScheduleTabs }
```

- [ ] **Step 2: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/staff-schedule/StaffScheduleTabs.tsx
git commit -m "feat(staff-schedule): добавить компонент StaffScheduleTabs с 3 табами"
```

---

### Task 10: StaffFilter — фильтр выбора сотрудника

**Files:**
- Create: `components/staff-schedule/StaffFilter.tsx`

- [ ] **Step 1: Создать компонент StaffFilter**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface StaffFilterProps {
	staff: OrgStaffMember[]
	selectedId: string | null
	onSelect: (staffId: string) => void
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function StaffFilter({ staff, selectedId, onSelect }: StaffFilterProps) {
	const t = useTranslations('staffSchedule')

	const renderStaffOption = (member: OrgStaffMember) => (
		<SelectItem key={member.id} value={member.id}>
			<div className="flex items-center gap-2">
				<Avatar className="size-5">
					<AvatarImage src={member.avatar} alt={member.name} />
					<AvatarFallback className="text-[10px]">
						{getInitials(member.name)}
					</AvatarFallback>
				</Avatar>
				<span>{member.name}</span>
				{member.position && (
					<span className="text-muted-foreground text-xs">
						{member.position}
					</span>
				)}
			</div>
		</SelectItem>
	)

	return (
		<Select value={selectedId ?? undefined} onValueChange={onSelect}>
			<SelectTrigger className="w-full max-w-sm">
				<SelectValue placeholder={t('selectStaff')} />
			</SelectTrigger>
			<SelectContent>
				{staff.map(renderStaffOption)}
			</SelectContent>
		</Select>
	)
}

export { StaffFilter }
```

- [ ] **Step 2: Commit**

```bash
git add components/staff-schedule/StaffFilter.tsx
git commit -m "feat(staff-schedule): добавить компонент StaffFilter"
```

---

### Task 11: Админская страница

**Files:**
- Create: `app/[locale]/(org)/manage/[orgId]/staff-schedule/page.tsx`

- [ ] **Step 1: Создать страницу**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { StaffFilter } from '@/components/staff-schedule/StaffFilter'
import { StaffScheduleTabs } from '@/components/staff-schedule/StaffScheduleTabs'
import { orgApi } from '@/lib/booking-api-client'
import type { OrgStaffMember } from '@/services/configs/booking.types'

export default function AdminStaffSchedulePage() {
	const params = useParams<{ orgId: string }>()
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()
	const t = useTranslations('staffSchedule')

	const orgId = params.orgId
	const staffId = searchParams.get('staffId')

	const [staffList, setStaffList] = useState<OrgStaffMember[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchStaff = async () => {
			try {
				const data = await orgApi.getStaff(orgId)
				setStaffList(data)
			} catch {
				// обрабатывается интерцептором toast
			} finally {
				setLoading(false)
			}
		}

		fetchStaff()
	}, [orgId])

	const handleSelectStaff = (id: string) => {
		const params = new URLSearchParams(searchParams.toString())
		params.set('staffId', id)
		params.delete('tab')
		router.replace(`${pathname}?${params.toString()}`)
	}

	if (loading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Spinner />
			</div>
		)
	}

	return (
		<div className="container max-w-3xl py-6">
			<h1 className="mb-4 text-lg font-semibold">{t('staffSchedule')}</h1>

			<StaffFilter
				staff={staffList}
				selectedId={staffId}
				onSelect={handleSelectStaff}
			/>

			<div className="mt-6">
				{staffId ? (
					<StaffScheduleTabs
						key={staffId}
						staffId={staffId}
						orgId={orgId}
						readOnly
					/>
				) : (
					<Empty>{t('selectStaffDescription')}</Empty>
				)}
			</div>
		</div>
	)
}
```

- [ ] **Step 2: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(org)/manage/[orgId]/staff-schedule/page.tsx
git commit -m "feat(staff-schedule): добавить админскую страницу staff-schedule"
```

---

### Task 12: Страница сотрудника

**Files:**
- Create: `app/[locale]/(org)/org/[orgId]/my-schedule/page.tsx`

- [ ] **Step 1: Создать страницу**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { StaffScheduleTabs } from '@/components/staff-schedule/StaffScheduleTabs'
import { useUser } from '@/lib/auth/user-provider'
import { orgApi } from '@/lib/booking-api-client'
import type { OrgStaffMember, OrgByIdResponse } from '@/services/configs/booking.types'

export default function MySchedulePage() {
	const params = useParams<{ orgId: string }>()
	const user = useUser()
	const t = useTranslations('staffSchedule')

	const orgId = params.orgId

	const [staffId, setStaffId] = useState<string | null>(null)
	const [orgName, setOrgName] = useState<string>('')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [staffList, orgData] = await Promise.all([
					orgApi.getStaff(orgId),
					orgApi.getById(orgId),
				])

				setOrgName(orgData.name)

				// Находим staff member текущего пользователя по userId
				const findCurrentStaff = (member: OrgStaffMember): boolean =>
					member.id === user.id

				const currentStaff = staffList.find(findCurrentStaff)
				if (currentStaff) {
					setStaffId(currentStaff.id)
				}
			} catch {
				// обрабатывается интерцептором toast
			} finally {
				setLoading(false)
			}
		}

		fetchData()
	}, [orgId, user.id])

	if (loading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Spinner />
			</div>
		)
	}

	if (!staffId) return null

	return (
		<div className="container max-w-3xl py-6">
			<h1 className="mb-4 text-lg font-semibold">
				{t('mySchedule')} — {orgName}
			</h1>

			<StaffScheduleTabs
				staffId={staffId}
				orgId={orgId}
				readOnly={false}
			/>
		</div>
	)
}
```

**Примечание:** Маппинг `user.id → staffId` пока через `orgApi.getStaff(orgId)` + поиск по `id === user.id`. Если бэкенд использует другой ID для staff member, нужно будет скорректировать логику поиска (например фильтр по `userId` если такое поле будет добавлено в `OrgStaffMember`).

- [ ] **Step 2: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(org)/org/[orgId]/my-schedule/page.tsx
git commit -m "feat(staff-schedule): добавить страницу сотрудника my-schedule"
```

---

### Task 13: OrgSidebar — добавить пункт Staff Schedule

**Files:**
- Modify: `components/sidebar/OrgSidebar.tsx`

- [ ] **Step 1: Добавить импорт иконки**

В секцию импортов добавить `ClipboardList` к существующим lucide-react иконкам:

```ts
import { Calendar, ArrowLeft, Users, Briefcase, Settings2, ClipboardList } from 'lucide-react'
```

- [ ] **Step 2: Добавить href для staff-schedule**

После `const servicesHref = buildHref(...)` добавить:

```ts
const staffScheduleHref = buildHref(`/manage/${orgId}/staff-schedule`)
```

- [ ] **Step 3: Добавить пункт меню**

В `<SidebarMenu>` после пункта Services (`<SidebarMenuItem>` с `servicesHref`) добавить:

```tsx
<SidebarMenuItem>
	<SidebarMenuButton
		render={<Link href={staffScheduleHref} />}
		isActive={isActive(staffScheduleHref)}
	>
		<ClipboardList className="size-4" />
		<span>{t('staffSchedule')}</span>
	</SidebarMenuButton>
</SidebarMenuItem>
```

- [ ] **Step 4: Проверить компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Проверить визуально**

Run: `npm run dev`
Открыть `/manage/[orgId]` — в сайдбаре должен появиться пункт "Staff Schedule" с иконкой ClipboardList.

- [ ] **Step 6: Commit**

```bash
git add components/sidebar/OrgSidebar.tsx
git commit -m "feat(sidebar): добавить пункт Staff Schedule в OrgSidebar"
```

---

### Task 14: Финальная проверка и интеграция

**Files:**
- All created/modified files

- [ ] **Step 1: Проверить TypeScript компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 2: Проверить ESLint**

Run: `npm run lint 2>&1 | tail -20`
Expected: No errors in new files

- [ ] **Step 3: Проверить Prettier**

Run: `npm run format`
Expected: Files formatted

- [ ] **Step 4: Проверить build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Ручная проверка — Админская страница**

1. Открыть `/manage/[orgId]/staff-schedule`
2. Проверить что фильтр сотрудника работает
3. Проверить 3 таба — данные подгружаются
4. Проверить что всё readonly
5. Проверить URL params (`?staffId=xxx&tab=overrides`)

- [ ] **Step 6: Ручная проверка — Страница сотрудника**

1. Открыть `/org/[orgId]/my-schedule`
2. Проверить что определяется staffId текущего пользователя
3. Проверить расписание — можно редактировать
4. Проверить выходные — можно создавать и удалять
5. Проверить букинги — навигация по неделям

- [ ] **Step 7: Commit formatting changes (если есть)**

```bash
git add -A
git commit -m "style: форматирование новых компонентов staff-schedule"
```
