'use client'

import { DateRangeControl } from './DateRangeControl'
import { StatusMultiSelect } from './StatusMultiSelect'
import { StaffSelect } from './StaffSelect'
import type { BookingStatusObject, OrgStaffMember } from '@/services'
import type {
	StatsFilters as StatsFiltersValue,
	StatsScope,
} from '@/services/configs/stats.types'

interface StatsFiltersProps {
	scope: StatsScope
	timezone: string
	statuses: BookingStatusObject[]
	staff: OrgStaffMember[] | null
	filters: StatsFiltersValue
	onChange: (next: StatsFiltersValue) => void
}

function StatsFilters({
	scope,
	timezone,
	statuses,
	staff,
	filters,
	onChange,
}: StatsFiltersProps) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<DateRangeControl
				filters={filters}
				timezone={timezone}
				onChange={onChange}
			/>
			<StatusMultiSelect
				filters={filters}
				statuses={statuses}
				onChange={onChange}
			/>
			{scope === 'org-admin' && staff && (
				<StaffSelect filters={filters} staff={staff} onChange={onChange} />
			)}
		</div>
	)
}

export { StatsFilters }
