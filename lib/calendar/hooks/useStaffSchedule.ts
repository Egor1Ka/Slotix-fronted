'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { eventTypeApi, scheduleApi } from '@/lib/booking-api-client'
import type {
	EventType,
	ScheduleTemplate,
	ScheduleOverride,
} from '@/services/configs/booking.types'

interface UseStaffScheduleResult {
	eventTypes: EventType[]
	schedule: ScheduleTemplate | null
	overrides: ScheduleOverride[]
	reloadSchedule: () => void
	loading: boolean
	error: string | null
}

const useStaffSchedule = (
	staffId: string | null,
	orgId?: string,
): UseStaffScheduleResult => {
	const [eventTypes, setEventTypes] = useState<EventType[]>([])
	const [schedule, setSchedule] = useState<ScheduleTemplate | null>(null)
	const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const hasLoadedRef = useRef(false)
	const [reloadTick, setReloadTick] = useState(0)

	const incrementTick = (n: number): number => n + 1

	const reloadSchedule = useCallback(() => {
		setReloadTick(incrementTick)
	}, [])

	useEffect(() => {
		if (!staffId) {
			setEventTypes([])
			setSchedule(null)
			setLoading(false)
			return
		}

		const loadSchedule = async () => {
			if (!hasLoadedRef.current) setLoading(true)
			setError(null)

			try {
				const [et, sc, ov] = await Promise.all([
					eventTypeApi.getByStaff(staffId),
					scheduleApi.getTemplate(staffId, orgId).catch(() => null),
					scheduleApi
						.getOverrides(staffId, orgId)
						.catch(() => [] as ScheduleOverride[]),
				])
				setEventTypes(et)
				setSchedule(sc)
				setOverrides(ov)
				hasLoadedRef.current = true
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to load schedule'
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadSchedule()
	}, [staffId, orgId, reloadTick])

	return { eventTypes, schedule, overrides, reloadSchedule, loading, error }
}

export type { UseStaffScheduleResult }
export { useStaffSchedule }
