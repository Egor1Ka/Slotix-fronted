import type { OrgStaffMember } from '@/services/configs/booking.types'
import type { ViewMode } from '../types'
import { addDays, getWeekDates } from '../utils'

interface DateRange {
	from: string
	to: string
}

const LIST_VIEW_DAYS = 14

const getMonthBounds = (dateStr: string): DateRange => {
	const [yearStr, monthStr] = dateStr.split('-')
	const year = Number(yearStr)
	const month = Number(monthStr)
	const firstDay = `${yearStr}-${monthStr}-01`
	const lastDayNum = new Date(Date.UTC(year, month, 0)).getUTCDate()
	const lastDay = `${yearStr}-${monthStr}-${String(lastDayNum).padStart(2, '0')}`
	return { from: firstDay, to: lastDay }
}

const computeDateRange = (
	dateStr: string,
	view: ViewMode,
	timezone: string,
): DateRange => {
	if (view === 'list') {
		return { from: dateStr, to: addDays(dateStr, LIST_VIEW_DAYS) }
	}
	if (view === 'week') {
		const weekDates = getWeekDates(dateStr, timezone)
		return { from: weekDates[0], to: weekDates[6] }
	}
	if (view === 'month') {
		return getMonthBounds(dateStr)
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
