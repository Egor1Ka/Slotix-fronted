'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { eventTypeApi, scheduleApi } from '@/lib/booking-api-client'
import type { EventType, ScheduleTemplate } from '@/services/configs/booking.types'

interface UseStaffScheduleResult {
	eventTypes: EventType[]
	schedule: ScheduleTemplate | null
	reloadSchedule: () => void
	loading: boolean
	error: string | null
}

const useStaffSchedule = (staffId: string | null): UseStaffScheduleResult => {
	const [eventTypes, setEventTypes] = useState<EventType[]>([])
	const [schedule, setSchedule] = useState<ScheduleTemplate | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const loadedStaffIdRef = useRef<string | null>(null)
	const hasLoadedRef = useRef(false)
	const [reloadTick, setReloadTick] = useState(0)

	const incrementTick = (n: number): number => n + 1

	const reloadSchedule = useCallback(() => {
		loadedStaffIdRef.current = null
		setReloadTick(incrementTick)
	}, [])

	useEffect(() => {
		if (!staffId) {
			setEventTypes([])
			setSchedule(null)
			setLoading(false)
			return
		}

		if (loadedStaffIdRef.current === staffId) return

		const loadSchedule = async () => {
			if (!hasLoadedRef.current) setLoading(true)
			setError(null)

			try {
				const [et, sc] = await Promise.all([
					eventTypeApi.getByStaff(staffId),
					scheduleApi.getTemplate(staffId).catch(() => null),
				])
				setEventTypes(et)
				setSchedule(sc)
				loadedStaffIdRef.current = staffId
				hasLoadedRef.current = true
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to load schedule'
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadSchedule()
	}, [staffId, reloadTick])

	return { eventTypes, schedule, reloadSchedule, loading, error }
}

export type { UseStaffScheduleResult }
export { useStaffSchedule }
