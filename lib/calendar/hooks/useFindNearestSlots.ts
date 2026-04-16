'use client'

import { useMemo } from 'react'
import {
	getAvailableSlots,
	timeToMin,
	type Slot,
	type SlotBooking,
} from '@/lib/slot-engine'
import {
	getWorkHoursForDate,
	getNowMinForDate,
	addDays,
} from '@/lib/calendar/utils'
import { wallClockInTz } from '@/lib/calendar/tz'
import type {
	ScheduleTemplate,
	ScheduleOverride,
	StaffBooking,
} from '@/services/configs/booking.types'

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

const diffMs = (a: string, b: string): number =>
	new Date(b).getTime() - new Date(a).getTime()

const toSlotBookingInTz =
	(timezone: string) =>
	(booking: StaffBooking): SlotBooking => {
		const wc = wallClockInTz(booking.startAt, timezone)
		return {
			startMin: wc.hour * 60 + wc.minute,
			duration: Math.round(diffMs(booking.startAt, booking.endAt) / 60_000),
		}
	}

const dateStrInTz = (iso: string, timezone: string): string =>
	new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
		new Date(iso),
	)

const filterBookingsByDate =
	(dateStr: string, timezone: string) =>
	(booking: StaffBooking): boolean =>
		dateStrInTz(booking.startAt, timezone) === dateStr

const toBreakBooking = (slot: {
	start: string
	end: string
}): SlotBooking => ({
	startMin: timeToMin(slot.start),
	duration: timeToMin(slot.end) - timeToMin(slot.start),
})

const normalizeDate = (dateStr: string): string =>
	dateStr.includes('T') ? dateStr.split('T')[0] : dateStr

const getBreakBookings = (
	overrides: ScheduleOverride[],
	dateStr: string,
	staffId?: string,
): SlotBooking[] => {
	if (!staffId) return []
	const dateOnly = normalizeDate(dateStr)
	const matchesStaffAndDate = (o: ScheduleOverride): boolean =>
		o.staffId === staffId && normalizeDate(o.date) === dateOnly
	const override = overrides.find(matchesStaffAndDate)
	if (!override) return []
	const isPartialDayOff = !override.enabled && override.slots.length > 0
	if (!isPartialDayOff) return []
	return override.slots.map(toBreakBooking)
}

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
		schedule.timezone,
		overrides,
		staffId,
	)
	if (!workHours) return []

	const tz = schedule.timezone
	const dayBookings = bookings.filter(filterBookingsByDate(dateStr, tz))
	const breakBookings = getBreakBookings(overrides, dateStr, staffId)
	const nowMin = getNowMinForDate(dateStr, tz)

	return getAvailableSlots({
		workStart: workHours.workStart,
		workEnd: workHours.workEnd,
		duration,
		slotStep: schedule.slotStepMin,
		slotMode: schedule.slotMode,
		bookings: [...dayBookings.map(toSlotBookingInTz(tz)), ...breakBookings],
		minNotice: 0,
		nowMin,
	})
}

const findNearestSlots = (
	params: FindNearestSlotsParams,
): FindNearestSlotsResult => {
	const {
		schedule,
		overrides,
		bookings,
		duration,
		startDate,
		fixedDate,
		staffId,
	} = params

	if (!schedule) return { date: startDate, slots: [] }

	if (fixedDate) {
		const slots = getSlotsForDate(
			startDate,
			schedule,
			overrides,
			bookings,
			duration,
			staffId,
		)
		return { date: startDate, slots }
	}

	const tryDate = (_: unknown, i: number): string => addDays(startDate, i)

	const dates = Array.from({ length: MAX_SEARCH_DAYS }, tryDate)

	const findFirstWithSlots = (
		result: FindNearestSlotsResult | null,
		dateStr: string,
	): FindNearestSlotsResult | null => {
		if (result) return result
		const slots = getSlotsForDate(
			dateStr,
			schedule,
			overrides,
			bookings,
			duration,
			staffId,
		)
		return slots.length > 0 ? { date: dateStr, slots } : null
	}

	return (
		dates.reduce(findFirstWithSlots, null) ?? { date: startDate, slots: [] }
	)
}

const useFindNearestSlots = (
	params: FindNearestSlotsParams,
): FindNearestSlotsResult => {
	const {
		schedule,
		overrides,
		bookings,
		duration,
		startDate,
		fixedDate,
		staffId,
	} = params

	return useMemo(
		() =>
			findNearestSlots({
				schedule,
				overrides,
				bookings,
				duration,
				startDate,
				fixedDate,
				staffId,
			}),
		[schedule, overrides, bookings, duration, startDate, fixedDate, staffId],
	)
}

export type { FindNearestSlotsParams, FindNearestSlotsResult }
export { useFindNearestSlots }
