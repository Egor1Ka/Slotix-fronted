'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { scheduleApi } from '@/lib/booking-api-client'
import type { ScheduleTemplate, WeeklyHours } from '@/services/configs/booking.types'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface UseOrgSchedulesResult {
	getStaffSchedule: (staffId: string) => ScheduleTemplate | null
	getOrgWorkHours: (dateStr: string) => { workStart: string; workEnd: string } | null
	getWorkingStaff: (dateStr: string, allStaff: OrgStaffMember[]) => OrgStaffMember[]
	getDisabledDays: (staffId: string | null) => number[]
	schedules: ScheduleTemplate[]
	loading: boolean
	error: string | null
}

const getDayOfWeek = (dateStr: string): number => new Date(dateStr).getDay()

const isDayEnabled = (weeklyHours: WeeklyHours[], dayOfWeek: number): boolean => {
	const day = weeklyHours.find((d) => d.dayOfWeek === dayOfWeek)
	return Boolean(day && day.enabled && day.slots.length > 0)
}

const getDaySlots = (weeklyHours: WeeklyHours[], dayOfWeek: number): { start: string; end: string }[] => {
	const day = weeklyHours.find((d) => d.dayOfWeek === dayOfWeek)
	if (!day || !day.enabled) return []
	return day.slots
}

const findEarliestStart = (allSlots: { start: string }[]): string =>
	allSlots.reduce((min, slot) => (slot.start < min ? slot.start : min), allSlots[0].start)

const findLatestEnd = (allSlots: { end: string }[]): string =>
	allSlots.reduce((max, slot) => (slot.end > max ? slot.end : max), allSlots[0].end)

const useOrgSchedules = (orgId: string): UseOrgSchedulesResult => {
	const [schedules, setSchedules] = useState<ScheduleTemplate[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const loadedOrgIdRef = useRef<string | null>(null)
	const hasLoadedRef = useRef(false)

	useEffect(() => {
		if (!orgId) return
		if (loadedOrgIdRef.current === orgId) return

		const loadSchedules = async () => {
			if (!hasLoadedRef.current) setLoading(true)
			setError(null)

			try {
				const data = await scheduleApi.getByOrg(orgId)
				setSchedules(data)
				loadedOrgIdRef.current = orgId
				hasLoadedRef.current = true
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to load schedules'
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadSchedules()
	}, [orgId])

	const getStaffSchedule = useCallback(
		(staffId: string): ScheduleTemplate | null => {
			const matchesStaff = (s: ScheduleTemplate): boolean => s.staffId === staffId
			return schedules.find(matchesStaff) ?? null
		},
		[schedules],
	)

	const getOrgWorkHours = useCallback(
		(dateStr: string): { workStart: string; workEnd: string } | null => {
			const dayOfWeek = getDayOfWeek(dateStr)

			const collectSlots = (acc: { start: string; end: string }[], schedule: ScheduleTemplate) => {
				const slots = getDaySlots(schedule.weeklyHours, dayOfWeek)
				return [...acc, ...slots]
			}
			const allSlots = schedules.reduce(collectSlots, [])

			if (allSlots.length === 0) return null

			return {
				workStart: findEarliestStart(allSlots),
				workEnd: findLatestEnd(allSlots),
			}
		},
		[schedules],
	)

	const getWorkingStaff = useCallback(
		(dateStr: string, allStaff: OrgStaffMember[]): OrgStaffMember[] => {
			const dayOfWeek = getDayOfWeek(dateStr)
			const hasScheduleForDay = (staff: OrgStaffMember): boolean => {
				const schedule = schedules.find((s) => s.staffId === staff.id)
				if (!schedule) return false
				return isDayEnabled(schedule.weeklyHours, dayOfWeek)
			}
			return allStaff.filter(hasScheduleForDay)
		},
		[schedules],
	)

	const getDisabledDays = useCallback(
		(staffId: string | null): number[] => {
			if (staffId) {
				const schedule = schedules.find((s) => s.staffId === staffId)
				if (!schedule) return []
				const isDisabled = (wh: WeeklyHours): boolean => !wh.enabled
				const toDayOfWeek = (wh: WeeklyHours): number => wh.dayOfWeek
				return schedule.weeklyHours.filter(isDisabled).map(toDayOfWeek)
			}

			const allDays = [0, 1, 2, 3, 4, 5, 6]
			const noOneWorks = (dayOfWeek: number): boolean =>
				!schedules.some((s) => isDayEnabled(s.weeklyHours, dayOfWeek))
			return allDays.filter(noOneWorks)
		},
		[schedules],
	)

	return {
		getStaffSchedule,
		getOrgWorkHours,
		getWorkingStaff,
		getDisabledDays,
		schedules,
		loading,
		error,
	}
}

export type { UseOrgSchedulesResult }
export { useOrgSchedules }
