# Calendar Overlap Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пересекающиеся booking-блоки в календаре отображаются рядом (делят ширину поровну с зазором), а не накладываются друг на друга.

**Architecture:** Чистая утилита `resolveOverlaps()` в `utils.ts` размечает `CalendarBlock[]` полями `column`/`totalColumns`. CalendarCore читает эти поля и задаёт `width`/`left` через inline styles. Стратегии не затрагиваются.

**Tech Stack:** TypeScript, React, CSS absolute positioning

---

### Task 1: Добавить поля `column` и `totalColumns` в `CalendarBlock`

**Files:**

- Modify: `lib/calendar/types.ts:8-22`

- [ ] **Step 1: Добавить опциональные поля в интерфейс**

В `lib/calendar/types.ts`, добавить два поля в `CalendarBlock` после `bookingId`:

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
}
```

- [ ] **Step 2: Проверить что билд не ломается**

Run: `npx tsc --noEmit`
Expected: без ошибок (поля опциональные, существующий код не затрагивается)

- [ ] **Step 3: Commit**

```bash
git add lib/calendar/types.ts
git commit -m "feat(calendar): add column/totalColumns fields to CalendarBlock"
```

---

### Task 2: Реализовать `resolveOverlaps()` в `utils.ts`

**Files:**

- Modify: `lib/calendar/utils.ts`

- [ ] **Step 1: Добавить вспомогательные функции и `resolveOverlaps`**

В конец файла `lib/calendar/utils.ts`, перед блоком `export type` добавить:

```ts
// ── Overlap Detection ──

const isBooking = (block: CalendarBlock): boolean =>
	block.blockType === 'booking'

const blocksOverlap = (a: CalendarBlock, b: CalendarBlock): boolean =>
	a.startMin < b.startMin + b.duration && b.startMin < a.startMin + a.duration

const byStartThenDuration = (a: CalendarBlock, b: CalendarBlock): number =>
	a.startMin !== b.startMin ? a.startMin - b.startMin : b.duration - a.duration

const findFirstFreeColumn = (usedColumns: number[]): number => {
	const sorted = [...usedColumns].sort((a, b) => a - b)
	const findGap = (col: number, idx: number): boolean => col !== idx
	const gapIdx = sorted.findIndex(findGap)
	return gapIdx === -1 ? sorted.length : gapIdx
}

const buildOverlapGroups = (bookings: CalendarBlock[]): CalendarBlock[][] => {
	const sorted = [...bookings].sort(byStartThenDuration)
	const groups: CalendarBlock[][] = []
	const visited = new Set<string>()

	const collectGroup = (start: CalendarBlock): CalendarBlock[] => {
		const group: CalendarBlock[] = [start]
		visited.add(start.id)

		const overlapsWithGroup = (block: CalendarBlock): boolean =>
			group.some((member) => blocksOverlap(member, block))

		let changed = true
		while (changed) {
			changed = false
			sorted.forEach((block) => {
				if (visited.has(block.id)) return
				if (!overlapsWithGroup(block)) return
				group.push(block)
				visited.add(block.id)
				changed = true
			})
		}

		return group
	}

	sorted.forEach((block) => {
		if (visited.has(block.id)) return
		groups.push(collectGroup(block))
	})

	return groups
}

const assignColumns = (group: CalendarBlock[]): CalendarBlock[] => {
	const sorted = [...group].sort(byStartThenDuration)
	const assignments = new Map<string, number>()

	sorted.forEach((block) => {
		const overlapping = sorted.filter(
			(other) => assignments.has(other.id) && blocksOverlap(block, other),
		)
		const usedColumns = overlapping.map((other) => assignments.get(other.id)!)
		assignments.set(block.id, findFirstFreeColumn(usedColumns))
	})

	const maxColumn = Math.max(...Array.from(assignments.values())) + 1

	const applyLayout = (block: CalendarBlock): CalendarBlock => ({
		...block,
		column: assignments.get(block.id)!,
		totalColumns: maxColumn,
	})

	return sorted.map(applyLayout)
}

const resolveOverlaps = (blocks: CalendarBlock[]): CalendarBlock[] => {
	const bookings = blocks.filter(isBooking)
	const nonBookings = blocks.filter((b) => !isBooking(b))

	if (bookings.length <= 1) return blocks

	const groups = buildOverlapGroups(bookings)

	const resolvedBookings = groups.flatMap(assignColumns)

	return [...nonBookings, ...resolvedBookings]
}
```

- [ ] **Step 2: Добавить import типа и export функции**

В начале `utils.ts` добавить import:

```ts
import type { CalendarBlock } from './types'
```

В блок `export {` добавить `resolveOverlaps`:

```ts
export {
	PX_PER_HOUR,
	createGridConfig,
	getCalendarLocale,
	minutesToPx,
	durationToPx,
	formatHour,
	formatDateISO,
	getTodayStr,
	formatDateLocale,
	formatWeekRange,
	formatMonth,
	getBookingsForDate,
	getWeekDates,
	getMonthGrid,
	addDays,
	addMonths,
	findEventType,
	getWorkHoursForDate,
	getFirstStaffId,
	filterByStaffId,
	getStaffToLoad,
	resolveOverlaps,
}
```

- [ ] **Step 3: Проверить что билд не ломается**

Run: `npx tsc --noEmit`
Expected: без ошибок

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/utils.ts
git commit -m "feat(calendar): add resolveOverlaps utility for overlap detection"
```

---

### Task 3: Интегрировать overlap layout в Day View

**Files:**

- Modify: `lib/calendar/CalendarCore.tsx`

- [ ] **Step 1: Добавить `resolveOverlaps` в импорт**

В `CalendarCore.tsx`, строка 28-40, добавить `resolveOverlaps` в import из `./utils`:

```ts
import {
	PX_PER_HOUR,
	createGridConfig,
	getCalendarLocale,
	minutesToPx,
	durationToPx,
	formatHour,
	getTodayStr,
	getWeekDates,
	getMonthGrid,
	addDays,
	addMonths,
	resolveOverlaps,
} from './utils'
```

- [ ] **Step 2: Добавить helper для вычисления overlap стилей**

Перед функцией `CalendarCore` (после `useSafeViewConfig`) добавить:

```ts
const OVERLAP_GAP_PX = 2

interface OverlapStyle {
	width: string
	left: string
}

const getOverlapStyle = (
	block: CalendarBlock,
	baseLeftPx: number,
	baseRightPx: number,
): OverlapStyle | null => {
	if (!block.totalColumns || block.totalColumns <= 1) return null
	const col = block.column ?? 0
	const total = block.totalColumns
	const availableWidth = `100% - ${baseLeftPx + baseRightPx}px`
	const colWidth = `(${availableWidth}) / ${total}`
	const gapOffset = `${OVERLAP_GAP_PX / 2}px`
	return {
		width: `calc(${colWidth} - ${OVERLAP_GAP_PX}px)`,
		left: `calc(${baseLeftPx}px + ${col} * (${colWidth}) + ${gapOffset})`,
	}
}
```

- [ ] **Step 3: Модифицировать `renderBookingBlock` для поддержки overlap**

Заменить текущий `renderBookingBlock` (строки 145-176):

```tsx
const renderBookingBlock = (block: CalendarBlock) => {
	const handleBlockClick = (e: React.MouseEvent) => {
		if (viewConfig.onBlockClick === 'none') {
			e.stopPropagation()
			return
		}
		block.onClick?.()
	}

	const overlap = getOverlapStyle(block, 48, 0)

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
			{block.label && <div className="truncate font-medium">{block.label}</div>}
			{block.sublabel && <div className="opacity-80">{block.sublabel}</div>}
		</div>
	)
}
```

- [ ] **Step 4: Вызвать `resolveOverlaps` в `renderDayView`**

В `renderDayView` (строка 234), заменить строку получения блоков:

До:

```ts
const blocks = strategy.getBlocks(date).filter(isInGridRange)
```

После:

```ts
const blocks = resolveOverlaps(strategy.getBlocks(date)).filter(isInGridRange)
```

- [ ] **Step 5: Проверить что билд не ломается**

Run: `npx tsc --noEmit`
Expected: без ошибок

- [ ] **Step 6: Визуальная проверка**

Run: `npm run dev`
Открыть админский календарь в Day View с пересекающимися букингами.
Expected: букинги стоят рядом, не накладываются, с зазором ~2px.

- [ ] **Step 7: Commit**

```bash
git add lib/calendar/CalendarCore.tsx
git commit -m "feat(calendar): integrate overlap layout in day view"
```

---

### Task 4: Интегрировать overlap layout в Week View

**Files:**

- Modify: `lib/calendar/CalendarCore.tsx`

- [ ] **Step 1: Модифицировать `renderWeekBlock` для поддержки overlap**

Заменить финальный `return` в `renderWeekBlock` (строки 345-361) — блок после `handleWeekBlockClick`:

```tsx
const overlap = getOverlapStyle(block, 2, 2)

return (
	<div
		key={block.id}
		className={cn(
			'absolute overflow-hidden rounded-sm px-0.5 text-[10px] leading-tight text-white',
			!overlap && 'inset-x-0.5',
		)}
		style={{
			top: minutesToPx(block.startMin, grid.displayStart),
			height: durationToPx(block.duration),
			backgroundColor: block.color,
			opacity: block.opacity ?? 1,
			...(overlap && { width: overlap.width, left: overlap.left }),
		}}
		onClick={handleWeekBlockClick}
	>
		{block.label && <div className="truncate font-medium">{block.label}</div>}
	</div>
)
```

- [ ] **Step 2: Вызвать `resolveOverlaps` в `renderDayColumn`**

В `renderDayColumn` (строка 407), заменить строку получения блоков:

До:

```ts
const blocks = isDisabled ? [] : strategy.getBlocks(dayDate)
```

После:

```ts
const blocks = isDisabled ? [] : resolveOverlaps(strategy.getBlocks(dayDate))
```

- [ ] **Step 3: Проверить что билд не ломается**

Run: `npx tsc --noEmit`
Expected: без ошибок

- [ ] **Step 4: Визуальная проверка**

Run: `npm run dev`
Открыть админский календарь в Week View с пересекающимися букингами.
Expected: букинги в week view стоят рядом друг с другом с зазором.

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/CalendarCore.tsx
git commit -m "feat(calendar): integrate overlap layout in week view"
```
