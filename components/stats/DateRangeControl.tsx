'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@/components/ui/select'
import { computePresetRange } from '@/hooks/useStatsFilters'
import type { StatsFilters, StatsPreset } from '@/services/configs/stats.types'

const PRESETS: StatsPreset[] = ['today', '7d', '30d', 'thisMonth', 'thisYear']

interface DateRangeControlProps {
	filters: StatsFilters
	timezone: string
	onChange: (next: StatsFilters) => void
}

const isoFromDate = (d: Date): string => d.toISOString().slice(0, 10)
const dateFromIso = (s: string): Date => new Date(`${s}T00:00:00Z`)

function DateRangeControl({
	filters,
	timezone,
	onChange,
}: DateRangeControlProps) {
	const t = useTranslations('stats.presets')
	const [open, setOpen] = useState(false)

	const handlePresetSelect = (value: string | null) => {
		if (!value) return
		const preset = value as StatsPreset
		if (preset === 'custom') {
			onChange({ ...filters, preset })
			return
		}
		const range = computePresetRange(preset, timezone)
		onChange({ ...filters, ...range, preset })
	}

	const handleCustomRange = (
		range: { from?: Date; to?: Date } | undefined,
	) => {
		if (!range || !range.from || !range.to) return
		onChange({
			...filters,
			from: isoFromDate(range.from),
			to: isoFromDate(range.to),
			preset: 'custom',
		})
		setOpen(false)
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Select value={filters.preset} onValueChange={handlePresetSelect}>
				<SelectTrigger className="w-44">
					<span>{t(filters.preset)}</span>
				</SelectTrigger>
				<SelectContent>
					{PRESETS.map((preset) => (
						<SelectItem key={preset} value={preset}>
							{t(preset)}
						</SelectItem>
					))}
					<SelectItem value="custom">{t('custom')}</SelectItem>
				</SelectContent>
			</Select>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button size="sm" variant="outline">
							<CalendarIcon className="mr-2 size-4" />
							{filters.from} – {filters.to}
						</Button>
					}
				/>
				<PopoverContent className="w-auto p-0">
					<Calendar
						mode="range"
						selected={{
							from: dateFromIso(filters.from),
							to: dateFromIso(filters.to),
						}}
						onSelect={handleCustomRange}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}

export { DateRangeControl }
