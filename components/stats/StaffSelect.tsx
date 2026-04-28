'use client'

import { useTranslations } from 'next-intl'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@/components/ui/select'
import type { OrgStaffMember } from '@/services'
import type { StatsFilters } from '@/services/configs/stats.types'

interface StaffSelectProps {
	staff: OrgStaffMember[]
	filters: StatsFilters
	onChange: (next: StatsFilters) => void
}

const findStaffName = (
	staff: OrgStaffMember[],
	staffId: string | null,
): string | null => {
	if (!staffId) return null
	const member = staff.find((m) => m.id === staffId)
	if (!member) return null
	return member.displayName ?? member.name
}

function StaffSelect({ staff, filters, onChange }: StaffSelectProps) {
	const t = useTranslations('stats.filters')

	const handleChange = (value: string | null) => {
		const staffId = !value || value === 'all' ? null : value
		onChange({ ...filters, staffId })
	}

	const selectedName = findStaffName(staff, filters.staffId)
	const triggerLabel = selectedName ?? `${t('staff')}: —`

	return (
		<Select value={filters.staffId ?? 'all'} onValueChange={handleChange}>
			<SelectTrigger className="w-56">
				<span className="truncate">{triggerLabel}</span>
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">{t('staff')}: —</SelectItem>
				{staff.map((member) => (
					<SelectItem key={member.id} value={member.id}>
						{member.displayName ?? member.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}

export { StaffSelect }
