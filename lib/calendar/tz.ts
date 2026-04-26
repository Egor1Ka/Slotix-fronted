const WEEKDAY_INDEX: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
}

const getDayOfWeekInTz = (dateStr: string, timezone: string): number => {
	const anchor = new Date(`${dateStr}T12:00:00Z`)
	const weekday = new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		timeZone: timezone,
	}).format(anchor)
	return WEEKDAY_INDEX[weekday] ?? 0
}

const todayInTz = (timezone: string): string =>
	new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())

interface WallClock {
	year: number
	month: number
	day: number
	hour: number
	minute: number
	dayOfWeek: number
}

const getPart = (parts: Intl.DateTimeFormatPart[], type: string): number => {
	const p = parts.find((x) => x.type === type)
	return p ? parseInt(p.value, 10) : 0
}

const WEEKDAY_MAP: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
}

const wallClockInTz = (iso: string, timezone: string): WallClock => {
	const d = new Date(iso)
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		weekday: 'short',
		hour12: false,
	}).formatToParts(d)
	const weekdayRaw = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
	return {
		year: getPart(parts, 'year'),
		month: getPart(parts, 'month'),
		day: getPart(parts, 'day'),
		hour: getPart(parts, 'hour') % 24,
		minute: getPart(parts, 'minute'),
		dayOfWeek: WEEKDAY_MAP[weekdayRaw] ?? 0,
	}
}

export { getDayOfWeekInTz, todayInTz, wallClockInTz }
export type { WallClock }
