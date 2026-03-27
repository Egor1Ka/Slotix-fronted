'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { bookingApi } from '@/lib/booking-api-client'
import { toCalendarDisplayBooking } from '@/lib/booking-utils'
import type { OrgStaffMember, EventType, CalendarDisplayBooking } from '@/services/configs/booking.types'
import type { ViewMode } from '../types'
import {
	computeDateRange,
	isWithinLoadedRange,
	buildStaffKey,
	extractStaffIds,
	type LoadedRange,
} from './helpers'

interface UseStaffBookingsResult {
	bookings: CalendarDisplayBooking[]
	reloadBookings: () => void
	loading: boolean
	error: string | null
}

const useStaffBookings = (
	staffToLoad: OrgStaffMember[],
	dateStr: string,
	view: ViewMode,
	eventTypes: EventType[],
): UseStaffBookingsResult => {
	const [bookings, setBookings] = useState<CalendarDisplayBooking[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const loadedRangeRef = useRef<LoadedRange | null>(null)
	const hasLoadedRef = useRef(false)
	const [reloadTick, setReloadTick] = useState(0)

	const incrementTick = (n: number): number => n + 1

	const reloadBookings = useCallback(() => {
		loadedRangeRef.current = null
		setReloadTick(incrementTick)
	}, [])

	useEffect(() => {
		if (staffToLoad.length === 0 || eventTypes.length === 0) {
			setBookings([])
			setLoading(false)
			return
		}

		const staffIds = extractStaffIds(staffToLoad)
		const staffKey = buildStaffKey(staffIds)
		const range = computeDateRange(dateStr, view)

		if (isWithinLoadedRange(loadedRangeRef.current, dateStr, view, staffKey)) return

		const loadBookings = async () => {
			if (!hasLoadedRef.current) setLoading(true)
			setError(null)

			try {
				const fetchStaffBookings = (staff: OrgStaffMember) =>
					bookingApi.getByStaff(staff.id, range.from, range.to, eventTypes)

				const bookingArrays = await Promise.all(
					staffToLoad.map(fetchStaffBookings),
				)

				const allBookings = bookingArrays
					.flat()
					.map(toCalendarDisplayBooking)

				setBookings(allBookings)
				loadedRangeRef.current = { ...range, view, staffKey }
				hasLoadedRef.current = true
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to load bookings'
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadBookings()
	}, [staffToLoad, dateStr, view, eventTypes, reloadTick])

	return { bookings, reloadBookings, loading, error }
}

export type { UseStaffBookingsResult }
export { useStaffBookings }
