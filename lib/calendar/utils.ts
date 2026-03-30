import type { CalendarBlock } from './types'

interface DateFilterable {
	date: string
}

const DEFAULT_DISPLAY_START = 9 * 60
const PX_PER_HOUR = 48
const PADDING_HOURS = 1

interface GridConfig {
	displayStart: number
	totalHours: number
	hourLabels: number[]
}

const parseHour = (time: string): number => parseInt(time.split(':')[0], 10)

const createGridConfig = (workStart: string, workEnd: string): GridConfig => {
	const startHour = Math.max(0, parseHour(workStart) - PADDING_HOURS)
	const endHour = Math.min(24, parseHour(workEnd) + PADDING_HOURS)
	const totalHours = endHour - startHour
	const createLabel = (_: unknown, i: number): number => startHour + i
	const hourLabels = Array.from({ length: totalHours + 1 }, createLabel)
	return { displayStart: startHour * 60, totalHours, hourLabels }
}

// ── Locale System (Intl-driven) ──

interface CalendarLocale {
	days: string[]
	daysLong: string[]
	daysShort: string[]
	months: string[]
	monthsFull: string[]
}

const buildMonthName =
	(formatter: Intl.DateTimeFormat) =>
	(_: unknown, i: number): string => {
		const date = new Date(2024, i, 1)
		return formatter.format(date)
	}

const WEEK_START_SUNDAY = new Date(2024, 0, 7)
const WEEK_START_MONDAY = new Date(2024, 0, 1)

const buildCalendarLocale = (locale: string): CalendarLocale => {
	const shortDay = new Intl.DateTimeFormat(locale, { weekday: 'short' })
	const longDay = new Intl.DateTimeFormat(locale, { weekday: 'long' })
	const shortMonth = new Intl.DateTimeFormat(locale, { month: 'short' })
	const longMonth = new Intl.DateTimeFormat(locale, { month: 'long' })

	const formatDayWith =
		(formatter: Intl.DateTimeFormat, base: Date) =>
		(_: unknown, i: number): string => {
			const d = new Date(base)
			d.setDate(base.getDate() + i)
			return formatter.format(d)
		}

	return {
		days: Array.from({ length: 7 }, formatDayWith(shortDay, WEEK_START_SUNDAY)),
		daysLong: Array.from({ length: 7 }, formatDayWith(longDay, WEEK_START_SUNDAY)),
		daysShort: Array.from({ length: 7 }, formatDayWith(shortDay, WEEK_START_MONDAY)),
		months: Array.from({ length: 12 }, buildMonthName(shortMonth)),
		monthsFull: Array.from({ length: 12 }, buildMonthName(longMonth)),
	}
}

const localeCache = new Map<string, CalendarLocale>()

const getCalendarLocale = (locale: string): CalendarLocale => {
	const cached = localeCache.get(locale)
	if (cached) return cached
	const built = buildCalendarLocale(locale)
	localeCache.set(locale, built)
	return built
}

const minutesToPx = (min: number, displayStart: number = DEFAULT_DISPLAY_START): number =>
	((min - displayStart) / 60) * PX_PER_HOUR

const durationToPx = (min: number): number => (min / 60) * PX_PER_HOUR

const formatHour = (hour: number): string =>
	`${String(hour).padStart(2, '0')}:00`

const formatDateISO = (d: Date): string => {
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const getTodayStr = (): string => formatDateISO(new Date())

const formatDateLocale = (dateStr: string, locale: CalendarLocale): string => {
	const d = new Date(dateStr + 'T00:00:00')
	return `${locale.days[d.getDay()]}, ${d.getDate()} ${locale.months[d.getMonth()]}`
}

const formatWeekRange = (dates: string[], locale: CalendarLocale): string => {
	const first = new Date(dates[0] + 'T00:00:00')
	const last = new Date(dates[6] + 'T00:00:00')
	if (first.getMonth() === last.getMonth()) {
		return `${first.getDate()} – ${last.getDate()} ${locale.months[first.getMonth()]} ${first.getFullYear()}`
	}
	return `${first.getDate()} ${locale.months[first.getMonth()]} – ${last.getDate()} ${locale.months[last.getMonth()]} ${last.getFullYear()}`
}

const formatMonth = (dateStr: string, locale: CalendarLocale): string => {
	const d = new Date(dateStr + 'T00:00:00')
	return `${locale.monthsFull[d.getMonth()]} ${d.getFullYear()}`
}

const getBookingsForDate = <T extends DateFilterable>(
	bookings: T[],
	date: string,
): T[] => {
	const matchesDate = (b: T): boolean => b.date === date
	return bookings.filter(matchesDate)
}

const getWeekStart = (dateStr: string): Date => {
	const d = new Date(dateStr + 'T00:00:00')
	const dayOfWeek = d.getDay()
	const diff = (dayOfWeek + 6) % 7
	const monday = new Date(d)
	monday.setDate(d.getDate() - diff)
	return monday
}

const createWeekDate =
	(monday: Date) =>
	(_: unknown, i: number): string => {
		const day = new Date(monday)
		day.setDate(monday.getDate() + i)
		return formatDateISO(day)
	}

const getWeekDates = (dateStr: string): string[] => {
	const monday = getWeekStart(dateStr)
	return Array.from({ length: 7 }, createWeekDate(monday))
}

const getMonthGrid = (dateStr: string): (string | null)[][] => {
	const d = new Date(dateStr + 'T00:00:00')
	const year = d.getFullYear()
	const month = d.getMonth()
	const firstDayWeekday = (new Date(year, month, 1).getDay() + 6) % 7
	const totalDays = new Date(year, month + 1, 0).getDate()
	const totalCells = firstDayWeekday + totalDays
	const rowCount = Math.ceil(totalCells / 7)

	const cellToDate = (_: unknown, i: number): string | null => {
		const dayNum = i - firstDayWeekday + 1
		if (dayNum < 1 || dayNum > totalDays) return null
		return `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
	}

	const allCells = Array.from({ length: rowCount * 7 }, cellToDate)

	const toRow = (_: unknown, rowIdx: number): (string | null)[] =>
		allCells.slice(rowIdx * 7, rowIdx * 7 + 7)

	return Array.from({ length: rowCount }, toRow)
}

const addDays = (dateStr: string, days: number): string => {
	const date = new Date(dateStr + 'T00:00:00')
	date.setDate(date.getDate() + days)
	return formatDateISO(date)
}

const addMonths = (dateStr: string, months: number): string => {
	const date = new Date(dateStr + 'T00:00:00')
	date.setMonth(date.getMonth() + months)
	return formatDateISO(date)
}

const findEventType = <T extends { id: string }>(
	eventTypes: T[],
	id: string | null,
): T | null => eventTypes.find((e) => e.id === id) ?? null

const getWorkHoursForDate = (
	weeklyHours: Array<{ dayOfWeek: number; enabled: boolean; slots: Array<{ start: string; end: string }> }>,
	dateStr: string,
): { workStart: string; workEnd: string } | null => {
	const dayOfWeek = new Date(dateStr).getDay()
	const daySchedule = weeklyHours.find(
		(d) => d.dayOfWeek === dayOfWeek,
	)
	if (!daySchedule || !daySchedule.enabled || daySchedule.slots.length === 0)
		return null
	return {
		workStart: daySchedule.slots[0].start,
		workEnd: daySchedule.slots[daySchedule.slots.length - 1].end,
	}
}

interface StaffLike {
	id: string
}

const getFirstStaffId = <T extends StaffLike>(staffList: T[] | null): string | null => {
	if (!staffList || !staffList[0]) return null
	return staffList[0].id
}

const filterByStaffId = <T extends StaffLike>(staffId: string) => (staff: T): boolean =>
	staff.id === staffId

const getStaffToLoad = <T extends StaffLike>(
	staffList: T[],
	selectedStaffId: string | null,
	behavior: string,
): T[] => {
	if (!selectedStaffId || behavior !== 'select-one') return staffList
	return staffList.filter(filterByStaffId(selectedStaffId))
}

// ── Overlap Detection ──

const isBooking = (block: CalendarBlock): boolean => block.blockType === 'booking'

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

export type { CalendarLocale, GridConfig }
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
