'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScheduleEditor } from '@/components/booking/ScheduleEditor'
import { SlotModeSelector } from '@/components/booking/SlotModeSelector'
import { TimezoneSelector } from '@/components/shared/TimezoneSelector'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getCalendarLocale } from '@/lib/calendar/utils'
import { scheduleApi } from '@/lib/booking-api-client'
import type { SlotMode } from '@/lib/slot-engine'
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
			<div className="flex flex-col">{schedule.weeklyHours.map(renderDay)}</div>
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

	const [savingMode, setSavingMode] = useState(false)
	const [localSlotMode, setLocalSlotMode] = useState<SlotMode>(
		schedule?.slotMode ?? 'fixed',
	)
	const [localSlotStep, setLocalSlotStep] = useState<number>(
		schedule?.slotStepMin ?? 30,
	)
	const [localTimezone, setLocalTimezone] = useState<string>(
		schedule?.timezone ?? '',
	)

	useEffect(() => {
		if (schedule) {
			setLocalSlotMode(schedule.slotMode)
			setLocalSlotStep(schedule.slotStepMin ?? 30)
			setLocalTimezone(schedule.timezone)
		}
	}, [schedule])

	const handleSave = async (weeklyHours: WeeklyHours[]) => {
		try {
			await scheduleApi.updateTemplate(
				staffId,
				orgId ?? null,
				weeklyHours,
				localSlotMode,
				localSlotStep,
				localTimezone,
			)
			await fetchSchedule()
			toast.success(t('scheduleSaved'))
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t('scheduleSaveError')
			toast.error(message)
			throw err
		}
	}

	const handleSlotModeChange = async (mode: SlotMode) => {
		if (!schedule) return
		setLocalSlotMode(mode)
		setSavingMode(true)
		try {
			await scheduleApi.updateTemplate(
				staffId,
				orgId ?? null,
				schedule.weeklyHours,
				mode,
				localSlotStep,
				localTimezone,
			)
			await fetchSchedule()
		} catch (err) {
			setLocalSlotMode(schedule.slotMode)
			const message =
				err instanceof Error ? err.message : t('scheduleSaveError')
			toast.error(message)
		} finally {
			setSavingMode(false)
		}
	}

	const handleSlotStepChange = async (value: string) => {
		if (!schedule) return
		const step = Number(value)
		setLocalSlotStep(step)
		setSavingMode(true)
		try {
			await scheduleApi.updateTemplate(
				staffId,
				orgId ?? null,
				schedule.weeklyHours,
				localSlotMode,
				step,
				localTimezone,
			)
			await fetchSchedule()
		} catch (err) {
			setLocalSlotStep(schedule.slotStepMin ?? 30)
			const message =
				err instanceof Error ? err.message : t('scheduleSaveError')
			toast.error(message)
		} finally {
			setSavingMode(false)
		}
	}

	const handleTimezoneChange = async (tz: string) => {
		if (!schedule) return
		setLocalTimezone(tz)
		setSavingMode(true)
		try {
			await scheduleApi.updateTemplate(
				staffId,
				orgId ?? null,
				schedule.weeklyHours,
				localSlotMode,
				localSlotStep,
				tz,
			)
			await fetchSchedule()
		} catch (err) {
			setLocalTimezone(schedule.timezone)
			const message =
				err instanceof Error ? err.message : t('scheduleSaveError')
			toast.error(message)
		} finally {
			setSavingMode(false)
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

	return (
		<div className="flex flex-col gap-6">
			<ScheduleEditor schedule={schedule} onSave={handleSave} />
			<Separator />
			{orgId ? (
				<div className="text-muted-foreground text-sm">
					{t('timezoneFromOrg')}: <span className="font-medium">{localTimezone}</span>
				</div>
			) : (
				<div className={cn(savingMode && 'pointer-events-none opacity-50')}>
					<TimezoneSelector
						value={localTimezone}
						onChange={handleTimezoneChange}
						label={t('timezone')}
					/>
				</div>
			)}
			<div className={savingMode ? 'pointer-events-none opacity-50' : ''}>
				<SlotModeSelector
					value={localSlotMode}
					onChange={handleSlotModeChange}
				/>
			</div>
			<div className={cn('flex flex-col gap-2', savingMode && 'pointer-events-none opacity-50')}>
				<Label>{t('slotStep')}</Label>
				<Select value={String(localSlotStep)} onValueChange={handleSlotStepChange}>
					<SelectTrigger className="w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Array.from({ length: 12 }, (_, i) => (i + 1) * 5).map((min) => (
							<SelectItem key={min} value={String(min)}>
								{min} {t('minutes')}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

export { ScheduleViewTab }
