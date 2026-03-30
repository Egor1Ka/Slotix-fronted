'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { ScheduleEditor } from '@/components/booking/ScheduleEditor'
import { getCalendarLocale } from '@/lib/calendar/utils'
import { scheduleApi } from '@/lib/booking-api-client'
import type {
	ScheduleTemplate,
	WeeklyHours,
} from '@/services/configs/booking.types'

interface ScheduleViewTabProps {
	staffId: string
	orgId: string
	readOnly: boolean
}

const formatSlots = (slots: { start: string; end: string }[]): string =>
	slots.map((s) => `${s.start} — ${s.end}`).join(', ')

function ReadOnlySchedule({ schedule }: { schedule: ScheduleTemplate }) {
	const locale = useLocale()
	const calendarLocale = getCalendarLocale(locale)

	const renderDay = (day: WeeklyHours) => {
		const dayName = calendarLocale.daysLong[day.dayOfWeek]

		return (
			<div
				key={day.dayOfWeek}
				className="flex items-center justify-between py-2"
			>
				<span className="text-sm font-medium">{dayName}</span>
				{day.enabled ? (
					<span className="text-sm">{formatSlots(day.slots)}</span>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				)}
			</div>
		)
	}

	return (
		<div className="flex flex-col">
			{schedule.weeklyHours.map((day, index) => (
				<div key={day.dayOfWeek}>
					{renderDay(day)}
					{index < schedule.weeklyHours.length - 1 && <Separator />}
				</div>
			))}
		</div>
	)
}

function ScheduleViewTab({ staffId, orgId, readOnly }: ScheduleViewTabProps) {
	const [schedule, setSchedule] = useState<ScheduleTemplate | null>(null)
	const [loading, setLoading] = useState(true)

	const fetchSchedule = useCallback(async () => {
		setLoading(true)
		try {
			const data = await scheduleApi.getTemplate(staffId)
			setSchedule(data)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setLoading(false)
		}
	}, [staffId])

	useEffect(() => {
		fetchSchedule()
	}, [fetchSchedule])

	const handleSave = async (weeklyHours: WeeklyHours[]) => {
		await scheduleApi.updateTemplate(staffId, orgId, weeklyHours)
		await fetchSchedule()
	}

	if (loading) {
		return (
			<div className="flex justify-center py-8">
				<Spinner />
			</div>
		)
	}

	if (!schedule) return null

	if (readOnly) {
		return <ReadOnlySchedule schedule={schedule} />
	}

	return <ScheduleEditor schedule={schedule} onSave={handleSave} />
}

export { ScheduleViewTab }
