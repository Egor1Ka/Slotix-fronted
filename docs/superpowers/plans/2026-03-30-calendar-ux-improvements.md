# Calendar UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показывать имя исполнителя (не клиента) + аватарку на блоках календаря, добавить секцию исполнителя в боковую панель, и inline layout для коротких событий.

**Architecture:** Расширяем `CalendarDisplayBooking` полями staff info, прокидываем через `toCalendarDisplayBooking` → `CalendarBlock` → рендер в CalendarCore. Боковая панель получает staff info через `staffList` в стратегии. Короткие события (<= 30 мин) рендерятся в одну строку.

**Tech Stack:** TypeScript, React, Next.js, Tailwind CSS

---

### Task 1: Расширить CalendarDisplayBooking и toCalendarDisplayBooking

**Files:**

- Modify: `services/configs/booking.types.ts:150-158`
- Modify: `lib/booking-utils.ts`

- [ ] **Step 1: Добавить поля staffName и staffAvatar в CalendarDisplayBooking**

В `services/configs/booking.types.ts`, изменить интерфейс:

```ts
interface CalendarDisplayBooking {
	startMin: number
	duration: number
	label: string
	color: string
	date: string
	bookingId: string
	status: BookingStatus
	staffName: string
	staffAvatar: string
}
```

- [ ] **Step 2: Изменить toCalendarDisplayBooking для приёма staff info и нового label**

В `lib/booking-utils.ts`, заменить всё содержимое:

```ts
import type {
	StaffBooking,
	CalendarDisplayBooking,
} from '@/services/configs/booking.types'

const timeToMinFromISO = (iso: string): number => {
	const d = new Date(iso)
	return d.getUTCHours() * 60 + d.getUTCMinutes()
}

const dateFromISO = (iso: string): string => iso.split('T')[0]

const diffMinutes = (startISO: string, endISO: string): number => {
	const start = new Date(startISO).getTime()
	const end = new Date(endISO).getTime()
	return Math.round((end - start) / 60000)
}

interface StaffInfo {
	name: string
	avatar: string
}

const toCalendarDisplayBooking =
	(staff: StaffInfo) =>
	(b: StaffBooking): CalendarDisplayBooking => ({
		startMin: timeToMinFromISO(b.startAt),
		duration: diffMinutes(b.startAt, b.endAt),
		label: `${b.eventTypeName} — ${staff.name}`,
		color: b.color,
		date: dateFromISO(b.startAt),
		bookingId: b.id,
		status: b.status,
		staffName: staff.name,
		staffAvatar: staff.avatar,
	})

export type { StaffInfo }
export { toCalendarDisplayBooking }
```

Обратить внимание: `toCalendarDisplayBooking` теперь **каррированная** — `(staff) => (booking) => CalendarDisplayBooking`.

- [ ] **Step 3: Проверить что билд выявит ошибки в useStaffBookings (ожидаемо)**

Run: `npx tsc --noEmit`
Expected: ошибка в `useStaffBookings.ts` — `toCalendarDisplayBooking` теперь требует аргумент `staff`.

- [ ] **Step 4: Commit**

```bash
git add services/configs/booking.types.ts lib/booking-utils.ts
git commit -m "feat(calendar): extend CalendarDisplayBooking with staff info, curry toCalendarDisplayBooking"
```

---

### Task 2: Прокинуть staff info в useStaffBookings

**Files:**

- Modify: `lib/calendar/hooks/useStaffBookings.ts:60-70`

- [ ] **Step 1: Изменить маппинг букингов чтобы прокидывать staff info**

В `lib/calendar/hooks/useStaffBookings.ts`, заменить функцию `loadBookings` (внутри useEffect, строки 56-80):

```ts
const loadBookings = async () => {
	if (!hasLoadedRef.current) setLoading(true)
	setError(null)

	try {
		const fetchAndMap = async (staff: OrgStaffMember) => {
			const staffBookings = await bookingApi.getByStaff(
				staff.id,
				range.from,
				range.to,
				eventTypes,
			)
			const mapWithStaff = toCalendarDisplayBooking({
				name: staff.name,
				avatar: staff.avatar,
			})
			return staffBookings.map(mapWithStaff)
		}

		const bookingArrays = await Promise.all(staffToLoad.map(fetchAndMap))

		const allBookings = bookingArrays.flat()

		setBookings(allBookings)
		loadedRangeRef.current = { ...range, view, staffKey }
		hasLoadedRef.current = true
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Failed to load bookings'
		setError(message)
	} finally {
		setLoading(false)
	}
}
```

- [ ] **Step 2: Проверить что билд проходит**

Run: `npx tsc --noEmit`
Expected: без ошибок (или ошибки в `createOrgStrategy` из-за `confirmedBooking` маппинга — это починим в Task 3)

- [ ] **Step 3: Commit**

```bash
git add lib/calendar/hooks/useStaffBookings.ts
git commit -m "feat(calendar): pass staff info when mapping bookings"
```

---

### Task 3: Добавить avatarUrl в CalendarBlock и прокинуть в стратегии

**Files:**

- Modify: `lib/calendar/types.ts`
- Modify: `lib/calendar/strategies/createOrgStrategy.tsx:107-148`

- [ ] **Step 1: Добавить avatarUrl в CalendarBlock**

В `lib/calendar/types.ts`, добавить поле после `totalColumns`:

```ts
interface CalendarBlock {
	id: string
	startMin: number
	duration: number
	date: string
	color: string
	opacity?: number
	borderStyle?: 'solid' | 'dashed'
	label?: string
	sublabel?: string
	onClick?: () => void
	draggable?: boolean
	blockType: BlockType
	bookingId?: string
	column?: number
	totalColumns?: number
	avatarUrl?: string
}
```

- [ ] **Step 2: Прокинуть avatarUrl в buildBookingBlocks и починить confirmedBooking**

В `createOrgStrategy.tsx`, заменить `allBookings` (строки 107-125) и `buildBookingBlocks` (строки 127-148):

```ts
const allBookings = (() => {
	if (!confirmedBooking || !selectedEventType) return bookings
	const startDate = new Date(confirmedBooking.startAt)
	const confirmedStartMin =
		startDate.getUTCHours() * 60 + startDate.getUTCMinutes()
	const confirmedDate = confirmedBooking.startAt.split('T')[0]
	return [
		...bookings,
		{
			startMin: confirmedStartMin,
			duration: confirmedBooking.durationMin,
			label: confirmedBooking.eventTypeName,
			color: confirmedBooking.color,
			date: confirmedDate,
			bookingId: confirmedBooking.bookingId,
			status: confirmedBooking.status,
			staffName: '',
			staffAvatar: '',
		},
	]
})()

const buildBookingBlocks = (blockDate: string): CalendarBlock[] => {
	const dayBookings = getBookingsForDate(allBookings, blockDate)

	const toBookingBlock = (
		booking: CalendarDisplayBooking,
		index: number,
	): CalendarBlock => ({
		id: `org-booking-${blockDate}-${index}`,
		startMin: booking.startMin,
		duration: booking.duration,
		date: blockDate,
		color: booking.color,
		label: booking.label,
		sublabel: `${minToTime(booking.startMin)}–${minToTime(booking.startMin + booking.duration)}`,
		blockType: 'booking',
		avatarUrl: booking.staffAvatar || undefined,
		onClick: onBookingSelect
			? () => onBookingSelect(booking.bookingId)
			: undefined,
	})

	return dayBookings.map(toBookingBlock)
}
```

- [ ] **Step 3: Проверить билд**

Run: `npx tsc --noEmit`
Expected: без ошибок

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/types.ts lib/calendar/strategies/createOrgStrategy.tsx
git commit -m "feat(calendar): pass avatarUrl through CalendarBlock from staff data"
```

---

### Task 4: Рендер аватарки и inline layout в CalendarCore

**Files:**

- Modify: `lib/calendar/CalendarCore.tsx`

- [ ] **Step 1: Добавить константу порога для коротких событий**

Рядом с `OVERLAP_GAP_PX` (около строки 91), добавить:

```ts
const SHORT_EVENT_THRESHOLD_MIN = 30
```

- [ ] **Step 2: Заменить renderBookingBlock с аватаркой и inline layout**

Заменить текущий `renderBookingBlock`:

```tsx
const renderBookingBlock = (block: CalendarBlock) => {
	const handleBlockClick = (e: React.MouseEvent) => {
		if (viewConfig.onBlockClick === 'none') {
			e.stopPropagation()
			return
		}
		block.onClick?.()
	}

	const overlap = getOverlapStyle(block, DAY_HOUR_LABEL_WIDTH_PX, 0)
	const isShort = block.duration <= SHORT_EVENT_THRESHOLD_MIN

	return (
		<div
			key={block.id}
			className={cn(
				'absolute overflow-hidden rounded-md px-2 py-1 text-xs text-white',
				!overlap && 'right-0 left-12',
				viewConfig.onBlockClick === 'open-booking-details' && 'cursor-pointer',
			)}
			style={{
				top: minutesToPx(block.startMin, grid.displayStart),
				height: durationToPx(block.duration),
				backgroundColor: block.color,
				opacity: block.opacity ?? 1,
				...(overlap && { width: overlap.width, left: overlap.left }),
			}}
			onClick={handleBlockClick}
		>
			<div
				className={cn(
					'flex items-center gap-1.5',
					isShort ? 'flex-row' : 'flex-col items-start',
				)}
			>
				<div className="flex min-w-0 items-center gap-1.5">
					{block.avatarUrl && (
						<img
							src={block.avatarUrl}
							alt=""
							className="size-4 shrink-0 rounded-full object-cover"
						/>
					)}
					{block.label && (
						<span className="truncate font-medium">{block.label}</span>
					)}
				</div>
				{block.sublabel && (
					<span
						className={cn(
							'shrink-0 opacity-80',
							isShort && 'before:content-["·_"]',
						)}
					>
						{block.sublabel}
					</span>
				)}
			</div>
		</div>
	)
}
```

- [ ] **Step 3: Проверить билд**

Run: `npx tsc --noEmit`
Expected: без ошибок

- [ ] **Step 4: Визуальная проверка**

Run: `npm run dev`
Открыть админский календарь. Проверить:

- Блоки показывают `"Услуга — Staff"` вместо `"Услуга — Клиент"`
- Аватарка 16px слева от label в day view
- Короткие события (30 мин) — label + sublabel в одну строку
- Week view — без аватарки (не меняли renderWeekBlock)

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/CalendarCore.tsx
git commit -m "feat(calendar): staff avatar on blocks + inline layout for short events"
```

---

### Task 5: Секция исполнителя в BookingDetailsPanel

**Files:**

- Modify: `components/booking/BookingDetailsPanel.tsx`
- Modify: `lib/calendar/strategies/createOrgStrategy.tsx`

- [ ] **Step 1: Добавить staffName/staffAvatar/staffPosition пропсы и StaffSection в BookingDetailsPanel**

В `components/booking/BookingDetailsPanel.tsx`, добавить пропсы и компонент.

Изменить `BookingDetailsPanelProps`:

```ts
interface BookingDetailsPanelProps {
	booking: BookingDetail
	eventTypeName: string
	eventTypeColor: string
	staffName?: string
	staffAvatar?: string
	staffPosition?: string
	onChangeStatus: (bookingId: string, status: BookingStatus) => Promise<void>
	onReschedule: (bookingId: string, newStartAt: string) => Promise<void>
	onClose: () => void
}
```

Добавить компонент `StaffSection` после `PanelHeader`:

```tsx
function StaffSection({
	staffName,
	staffAvatar,
	staffPosition,
	t,
}: {
	staffName: string
	staffAvatar?: string
	staffPosition?: string
	t: ReturnType<typeof useTranslations<'booking'>>
}) {
	return (
		<div className="flex items-center gap-3">
			{staffAvatar ? (
				<img
					src={staffAvatar}
					alt={staffName}
					className="size-8 shrink-0 rounded-full object-cover"
				/>
			) : (
				<div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
					{staffName.charAt(0).toUpperCase()}
				</div>
			)}
			<div className="flex flex-col">
				<span className="text-sm font-medium">{staffName}</span>
				{staffPosition && (
					<span className="text-muted-foreground text-xs">{staffPosition}</span>
				)}
			</div>
		</div>
	)
}
```

Изменить `BookingDetailsPanel` — деструктурировать новые пропсы и добавить StaffSection:

```tsx
function BookingDetailsPanel({
	booking,
	eventTypeName,
	eventTypeColor,
	staffName,
	staffAvatar,
	staffPosition,
	onChangeStatus,
	onClose,
}: BookingDetailsPanelProps) {
	const t = useTranslations('booking')

	return (
		<div className="flex flex-col gap-3">
			<PanelHeader
				eventTypeName={eventTypeName}
				eventTypeColor={eventTypeColor}
				onClose={onClose}
				closeLabel={t('close')}
			/>
			{staffName && (
				<>
					<Separator />
					<StaffSection
						staffName={staffName}
						staffAvatar={staffAvatar}
						staffPosition={staffPosition}
						t={t}
					/>
				</>
			)}
			<Separator />
			<TimeGrid booking={booking} t={t} />
			<Separator />
			<ClientSection booking={booking} t={t} />
			<Separator />
			<StatusAndPayment booking={booking} t={t} />
			<Separator />
			<ActionButtons booking={booking} onChangeStatus={onChangeStatus} t={t} />
		</div>
	)
}
```

- [ ] **Step 2: Прокинуть staff info в renderPanel стратегии**

В `lib/calendar/strategies/createOrgStrategy.tsx`, нужно:

1. Добавить `staffList` в `OrgStrategyParams`:

```ts
interface OrgStrategyParams {
	// ... существующие поля ...
	staffList?: OrgStaffMember[]
}
```

2. Добавить import `OrgStaffMember` (уже импортируется — проверить, если нет — добавить).

3. В деструктуризации params добавить: `staffList = [],`

4. В `renderPanel()`, в блоке `if (selectedBooking)`, найти staff по hosts:

```ts
if (selectedBooking) {
	const bookingEventType = findEventType(eventTypes, selectedBooking.eventTypeId)
	const staffUserId = selectedBooking.hosts[0]?.userId ?? null
	const findStaffByUserId = (s: OrgStaffMember): boolean => s.id === staffUserId
	const bookingStaff = staffList.find(findStaffByUserId)

	return (
		<>
			{bookingError && (
				<div className="text-destructive bg-destructive/10 rounded-md p-3 text-sm mb-3">
					{bookingError}
				</div>
			)}
			<BookingDetailsPanel
				booking={selectedBooking}
				eventTypeName={bookingEventType?.name ?? ''}
				eventTypeColor={bookingEventType?.color ?? '#888'}
				staffName={bookingStaff?.name}
				staffAvatar={bookingStaff?.avatar}
				staffPosition={bookingStaff?.position ?? undefined}
				onChangeStatus={onBookingStatusChange ?? (async () => {})}
				onReschedule={onBookingReschedule ?? (async () => {})}
				onClose={onBookingClose ?? (() => {})}
			/>
		</>
	)
}
```

- [ ] **Step 3: Передать staffList в createOrgStrategy из OrgCalendarPage**

В `components/booking/OrgCalendarPage.tsx`, в вызове `createOrgStrategy({...})` (строка 212-248), добавить:

```ts
const strategy = createOrgStrategy({
	// ... существующие пропсы ...
	staffList,
})
```

Добавить `staffList` после `loading: contentLoading,` (перед закрывающей `}`).

- [ ] **Step 4: Проверить билд**

Run: `npx tsc --noEmit`
Expected: без ошибок

- [ ] **Step 5: Визуальная проверка**

Run: `npm run dev`
Кликнуть на букинг в календаре. В боковой панели должна появиться секция с аватаркой, именем и должностью исполнителя, между заголовком и временем.

- [ ] **Step 6: Commit**

```bash
git add components/booking/BookingDetailsPanel.tsx lib/calendar/strategies/createOrgStrategy.tsx components/booking/OrgCalendarPage.tsx
git commit -m "feat(calendar): staff section in booking details panel"
```
