'use client'

import { useMemo } from 'react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface TimezoneSelectorProps {
	value: string
	onChange: (tz: string) => void
	label: string
}

const FALLBACK_TIMEZONES = [
	'UTC',
	'Europe/Kyiv',
	'Europe/London',
	'America/New_York',
	'America/Los_Angeles',
	'Asia/Tokyo',
]

const getSupportedTimezones = (): string[] => {
	const intl = Intl as unknown as {
		supportedValuesOf?: (key: string) => string[]
	}
	if (intl.supportedValuesOf) return intl.supportedValuesOf('timeZone')
	return FALLBACK_TIMEZONES
}

const renderOption = (tz: string) => (
	<SelectItem key={tz} value={tz}>
		{tz}
	</SelectItem>
)

function TimezoneSelector({ value, onChange, label }: TimezoneSelectorProps) {
	const options = useMemo(getSupportedTimezones, [])

	const handleValueChange = (next: string | null) => {
		if (!next) return
		onChange(next)
	}

	return (
		<div className="flex flex-col gap-2">
			<Label>{label}</Label>
			<Select value={value} onValueChange={handleValueChange}>
				<SelectTrigger className="w-full max-w-sm">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>{options.map(renderOption)}</SelectContent>
			</Select>
		</div>
	)
}

export { TimezoneSelector }
