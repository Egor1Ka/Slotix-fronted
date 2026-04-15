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

const extractTimeStr = (isoStr: string): string =>
	isoStr.split('T')[1]?.slice(0, 5) ?? '00:00'

const calcDurationMin = (startAt: string, endAt: string): number => {
	const startMin = timeToMin(extractTimeStr(startAt))
	const endMin = timeToMin(extractTimeStr(endAt))
	return endMin - startMin
}

const toSlotBooking = (booking: StaffBooking): SlotBooking => ({
	startMin: timeToMin(extractTimeStr(booking.startAt)),
	duration: calcDurationMin(booking.startAt, booking.endAt),
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
		schedule.timezone,
		overrides,
		staffId,
	)
	if (!workHours) return []

	const dayBookings = bookings.filter(filterBookingsByDate(dateStr))
	const nowMin = getNowMinForDate(dateStr, schedule.timezone)

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
