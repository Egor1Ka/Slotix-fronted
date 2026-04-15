import type { OrgStaffMember } from '@/services/configs/booking.types'
import type { ViewMode } from '../types'
import { formatDateISO, getWeekDates } from '../utils'

interface DateRange {
	from: string
	to: string
}

const LIST_VIEW_DAYS = 14

const computeDateRange = (
	dateStr: string,
	view: ViewMode,
	timezone: string,
): DateRange => {
	if (view === 'list') {
		const from = new Date(dateStr + 'T00:00:00')
		const to = new Date(from)
		to.setDate(to.getDate() + LIST_VIEW_DAYS)
		return { from: dateStr, to: formatDateISO(to) }
	}
	if (view === 'week') {
		const weekDates = getWeekDates(dateStr, timezone)
		return { from: weekDates[0], to: weekDates[6] }
	}
	if (view === 'month') {
		const d = new Date(dateStr + 'T00:00:00')
		const year = d.getFullYear()
		const month = d.getMonth()
		const firstDay = formatDateISO(new Date(year, month, 1))
		const lastDay = formatDateISO(new Date(year, month + 1, 0))
		return { from: firstDay, to: lastDay }
	}
	return { from: dateStr, to: dateStr }
}

interface LoadedRange {
	from: string
	to: string
	view: string
	staffKey: string
}

const isWithinLoadedRange = (
	loaded: LoadedRange | null,
	dateStr: string,
	view: ViewMode,
	staffKey: string,
): boolean => {
	if (!loaded) return false
	if (loaded.view !== view) return false
	if (loaded.staffKey !== staffKey) return false
	return dateStr >= loaded.from && dateStr <= loaded.to
}

const buildStaffKey = (staffIds: string[]): string => staffIds.join(',')

const extractStaffIds = (staff: OrgStaffMember[]): string[] => {
	const toId = (s: OrgStaffMember): string => s.id
	return staff.map(toId)
}

export type { DateRange, LoadedRange }
export { computeDateRange, isWithinLoadedRange, buildStaffKey, extractStaffIds }
