'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { ScheduleOverrideForm } from '@/components/booking/ScheduleOverrideForm'
import { OverrideListItem } from './OverrideListItem'
import { scheduleApi } from '@/lib/booking-api-client'
import type { ScheduleOverride, CreateScheduleOverrideBody } from '@/services/configs/booking.types'

interface OverridesTabProps {
	staffId: string
	orgId: string
	readOnly: boolean
}

const isDatePast = (dateStr: string): boolean =>
	new Date(dateStr + 'T23:59:59') < new Date()

const sortByDate = (a: ScheduleOverride, b: ScheduleOverride): number =>
	new Date(a.date).getTime() - new Date(b.date).getTime()

const sortByDateDesc = (a: ScheduleOverride, b: ScheduleOverride): number =>
	new Date(b.date).getTime() - new Date(a.date).getTime()

function OverridesTab({ staffId, orgId, readOnly }: OverridesTabProps) {
	const t = useTranslations('staffSchedule')
	const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
	const [loading, setLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)

	const fetchOverrides = useCallback(async () => {
		setLoading(true)
		try {
			const data = await scheduleApi.getOverrides(staffId)
			setOverrides(data)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setLoading(false)
		}
	}, [staffId])

	useEffect(() => {
		fetchOverrides()
	}, [fetchOverrides])

	const handleSave = async (body: CreateScheduleOverrideBody) => {
		await scheduleApi.createOverride(body)
		setShowForm(false)
		await fetchOverrides()
	}

	const handleDelete = async (id: string) => {
		await scheduleApi.deleteOverride(id)
		await fetchOverrides()
	}

	const toggleForm = () => setShowForm((prev) => !prev)

	if (loading) {
		return (
			<div className="flex justify-center py-8">
				<Spinner />
			</div>
		)
	}

	const futureOverrides = overrides
		.filter((o) => !isDatePast(o.date))
		.sort(sortByDate)

	const pastOverrides = overrides
		.filter((o) => isDatePast(o.date))
		.sort(sortByDateDesc)

	const renderOverrideItem = (isPast: boolean) => (override: ScheduleOverride) => (
		<OverrideListItem
			key={override.id}
			override={override}
			readOnly={readOnly}
			isPast={isPast}
			onDelete={handleDelete}
		/>
	)

	const hasNoOverrides = futureOverrides.length === 0 && pastOverrides.length === 0

	return (
		<div className="flex flex-col gap-4">
			{!readOnly && (
				<div className="flex justify-end">
					<Button variant="outline" size="sm" onClick={toggleForm}>
						<Plus className="mr-1 size-4" />
						{t('addOverride')}
					</Button>
				</div>
			)}

			{!readOnly && showForm && (
				<>
					<ScheduleOverrideForm staffId={staffId} onSave={handleSave} />
					<Separator />
				</>
			)}

			{hasNoOverrides && (
				<Empty>{t('noOverrides')}</Empty>
			)}

			{futureOverrides.length > 0 && (
				<div className="flex flex-col gap-2">
					<h4 className="text-muted-foreground text-xs font-semibold uppercase">
						{t('futureOverrides')}
					</h4>
					{futureOverrides.map(renderOverrideItem(false))}
				</div>
			)}

			{pastOverrides.length > 0 && (
				<div className="flex flex-col gap-2">
					<h4 className="text-muted-foreground text-xs font-semibold uppercase">
						{t('pastOverrides')}
					</h4>
					{pastOverrides.map(renderOverrideItem(true))}
				</div>
			)}
		</div>
	)
}

export { OverridesTab }
