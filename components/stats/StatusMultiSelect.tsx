'use client'

import { Filter } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { translateStatusLabel } from '@/lib/stats/status-label'
import type { BookingStatusObject } from '@/services'
import type { StatsFilters } from '@/services/configs/stats.types'

interface StatusMultiSelectProps {
	statuses: BookingStatusObject[]
	filters: StatsFilters
	onChange: (next: StatsFilters) => void
}

const isStatusActive = (id: string, statusIds: string[] | null): boolean =>
	statusIds === null || statusIds.includes(id)

const toggleStatus = (
	id: string,
	statusIds: string[] | null,
	allIds: string[],
): string[] | null => {
	const effective = statusIds === null ? [...allIds] : [...statusIds]
	const at = effective.indexOf(id)
	if (at === -1) effective.push(id)
	else effective.splice(at, 1)
	if (effective.length === allIds.length) return null
	return effective
}

function StatusMultiSelect({
	statuses,
	filters,
	onChange,
}: StatusMultiSelectProps) {
	const t = useTranslations('stats.filters')
	const tBooking = useTranslations('booking')

	const activeStatuses = statuses.filter((s) => !s.isArchived)
	const allIds = activeStatuses.map((s) => s.id)

	const handleToggle = (id: string) => {
		const next = toggleStatus(id, filters.statusIds, allIds)
		onChange({ ...filters, statusIds: next })
	}

	const activeCount =
		filters.statusIds === null ? allIds.length : filters.statusIds.length

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button size="sm" variant="outline">
						<Filter className="mr-2 size-4" />
						{t('status')} · {activeCount}/{allIds.length}
					</Button>
				}
			/>
			<PopoverContent className="w-64 p-2">
				<div className="flex flex-col gap-1">
					{activeStatuses.map((status) => (
						<label
							key={status.id}
							className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded p-2 text-sm"
						>
							<Checkbox
								checked={isStatusActive(status.id, filters.statusIds)}
								onCheckedChange={() => handleToggle(status.id)}
							/>
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: status.color }}
							/>
							{translateStatusLabel(status.label, tBooking)}
						</label>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}

export { StatusMultiSelect }
