'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, CalendarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { ScheduleOverrideForm } from '@/components/booking/ScheduleOverrideForm'
import { OverrideListItem } from './OverrideListItem'
import { scheduleApi } from '@/lib/booking-api-client'
import { getTodayStrInTz } from '@/lib/calendar/utils'
import type {
	ScheduleOverride,
	CreateScheduleOverrideBody,
} from '@/services/configs/booking.types'

interface OverridesTabProps {
	staffId: string
	orgId?: string
	readOnly: boolean
}

const isDatePast = (dateStr: string, timezone: string): boolean => {
	const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
	const todayStr = getTodayStrInTz(timezone)
	return dateOnly < todayStr
}

const sortByDate = (a: ScheduleOverride, b: ScheduleOverride): number =>
	new Date(a.date).getTime() - new Date(b.date).getTime()

const sortByDateDesc = (a: ScheduleOverride, b: ScheduleOverride): number =>
	new Date(b.date).getTime() - new Date(a.date).getTime()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OverridesTab({ staffId, orgId, readOnly }: OverridesTabProps) {
	const t = useTranslations('staffSchedule')
	const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
	const [loading, setLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [timezone, setTimezone] = useState<string | null>(null)

	useEffect(() => {
		const loadTimezone = async () => {
			const schedule = await scheduleApi.getTemplate(staffId, orgId).catch(() => null)
			setTimezone(schedule?.timezone ?? null)
		}
		loadTimezone()
	}, [staffId, orgId])

	const fetchOverrides = useCallback(async () => {
		setLoading(true)
		try {
			const data = await scheduleApi.getOverrides(staffId, orgId)
			setOverrides(data)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setLoading(false)
		}
	}, [staffId, orgId])

	useEffect(() => {
		fetchOverrides()
	}, [fetchOverrides])

	const handleSave = async (body: CreateScheduleOverrideBody) => {
		try {
			await scheduleApi.createOverride(body)
			setShowForm(false)
			const overrides = await scheduleApi.getOverrides(staffId, orgId)
			setOverrides(overrides)
			toast.success(t('overrideSaved'))
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t('overrideSaveError')
			toast.error(message)
			throw err
		}
	}

	const handleDelete = async (id: string) => {
		try {
			await scheduleApi.deleteOverride(id)
			await fetchOverrides()
			toast.success(t('overrideDeleted'))
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t('overrideDeleteError')
			toast.error(message)
		}
	}

	const toggleForm = () => setShowForm((prev) => !prev)

	if (loading || timezone === null) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-6" />
			</div>
		)
	}

	const futureOverrides = overrides
		.filter((o) => !isDatePast(o.date, timezone))
		.sort(sortByDate)

	const pastOverrides = overrides
		.filter((o) => isDatePast(o.date, timezone))
		.sort(sortByDateDesc)

	const renderFutureItem = (override: ScheduleOverride) => (
		<OverrideListItem
			key={override.id}
			override={override}
			timezone={timezone}
			readOnly={readOnly}
			isPast={false}
			onDelete={handleDelete}
		/>
	)

	const renderPastItem = (override: ScheduleOverride) => (
		<OverrideListItem
			key={override.id}
			override={override}
			timezone={timezone}
			readOnly={readOnly}
			isPast
			onDelete={handleDelete}
		/>
	)

	const hasNoOverrides =
		futureOverrides.length === 0 && pastOverrides.length === 0

	return (
		<div data-slot="overrides-tab" className="flex flex-col gap-6">
			{!readOnly && (
				<div className="flex justify-end">
					<Button variant="outline" size="sm" onClick={toggleForm}>
						<Plus className="mr-1 size-4" />
						{t('addOverride')}
					</Button>
				</div>
			)}

			{!readOnly && showForm && (
				<div className="rounded-lg border p-4">
					<ScheduleOverrideForm
						staffId={staffId}
						orgId={orgId}
						onSave={handleSave}
					/>
				</div>
			)}

			{hasNoOverrides && (
				<Empty className="rounded-xl border border-dashed py-12">
					<EmptyHeader>
						<CalendarOff className="text-muted-foreground mx-auto mb-2 size-8" />
						<EmptyTitle>{t('noOverrides')}</EmptyTitle>
						<EmptyDescription>
							{!readOnly ? t('noOverridesHint') : ''}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}

			{futureOverrides.length > 0 && (
				<div className="flex flex-col gap-2">
					<h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
						{t('futureOverrides')}
					</h4>
					<div className="flex flex-col gap-1.5">
						{futureOverrides.map(renderFutureItem)}
					</div>
				</div>
			)}

			{futureOverrides.length > 0 && pastOverrides.length > 0 && <Separator />}

			{pastOverrides.length > 0 && (
				<div className="flex flex-col gap-2">
					<h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
						{t('pastOverrides')}
					</h4>
					<div className="flex flex-col gap-1.5">
						{pastOverrides.map(renderPastItem)}
					</div>
				</div>
			)}
		</div>
	)
}

export { OverridesTab }
