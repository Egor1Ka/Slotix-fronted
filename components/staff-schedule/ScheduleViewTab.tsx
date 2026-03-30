'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScheduleEditor } from '@/components/booking/ScheduleEditor'
import { cn } from '@/lib/utils'
import { getCalendarLocale } from '@/lib/calendar/utils'
import { scheduleApi } from '@/lib/booking-api-client'
import type {
	ScheduleTemplate,
	WeeklyHours,
} from '@/services/configs/booking.types'

interface ScheduleViewTabProps {
	staffId: string
	orgId?: string
	readOnly: boolean
}

const formatSlots = (slots: { start: string; end: string }[]): string =>
	slots.map((s) => `${s.start} — ${s.end}`).join(', ')

function ReadOnlyDayRow({
	day,
	dayName,
}: {
	day: WeeklyHours
	dayName: string
}) {
	return (
		<div
			data-slot="schedule-day-row"
			className={cn(
				'flex items-center justify-between py-2.5',
				!day.enabled && 'opacity-50',
			)}
		>
			<span className="text-sm font-medium">{dayName}</span>
			{day.enabled ? (
				<Badge variant="secondary" className="font-mono text-xs">
					{formatSlots(day.slots)}
				</Badge>
			) : (
				<span className="text-muted-foreground text-sm">—</span>
			)}
		</div>
	)
}

function ReadOnlySchedule({ schedule }: { schedule: ScheduleTemplate }) {
	const locale = useLocale()
	const calendarLocale = getCalendarLocale(locale)

	const isLastDay = (index: number): boolean =>
		index >= schedule.weeklyHours.length - 1

	const renderDay = (day: WeeklyHours, index: number) => (
		<div key={day.dayOfWeek}>
			<ReadOnlyDayRow
				day={day}
				dayName={calendarLocale.daysLong[day.dayOfWeek]}
			/>
			{!isLastDay(index) && <Separator />}
		</div>
	)

	return (
		<div data-slot="readonly-schedule" className="rounded-lg border p-4">
			<div className="flex flex-col">
				{schedule.weeklyHours.map(renderDay)}
			</div>
		</div>
	)
}

function ScheduleViewTab({ staffId, orgId, readOnly }: ScheduleViewTabProps) {
	const t = useTranslations('staffSchedule')
	const [schedule, setSchedule] = useState<ScheduleTemplate | null>(null)
	const [loading, setLoading] = useState(true)

	const fetchSchedule = useCallback(async () => {
		setLoading(true)
		try {
			const data = await scheduleApi.getTemplate(staffId, orgId)
			setSchedule(data)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setLoading(false)
		}
	}, [staffId, orgId])

	useEffect(() => {
		fetchSchedule()
	}, [fetchSchedule])

	const handleSave = async (weeklyHours: WeeklyHours[]) => {
		try {
			await scheduleApi.updateTemplate(staffId, orgId ?? null, weeklyHours)
			await fetchSchedule()
			toast.success(t('scheduleSaved'))
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t('scheduleSaveError')
			toast.error(message)
			throw err
		}
	}

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-6" />
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
