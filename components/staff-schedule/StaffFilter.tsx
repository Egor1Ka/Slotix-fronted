'use client'

import { useTranslations } from 'next-intl'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface StaffFilterProps {
	staff: OrgStaffMember[]
	selectedId: string | null
	onSelect: (staffId: string) => void
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

const renderStaffOption = (member: OrgStaffMember) => (
	<SelectItem key={member.id} value={member.id}>
		<div className="flex items-center gap-2">
			<Avatar className="size-5">
				<AvatarImage src={member.avatar} alt={member.name} />
				<AvatarFallback className="text-[10px]">
					{getInitials(member.name)}
				</AvatarFallback>
			</Avatar>
			<span>{member.name}</span>
			{member.position && (
				<span className="text-muted-foreground text-xs">
					{member.position}
				</span>
			)}
		</div>
	</SelectItem>
)

function StaffFilter({ staff, selectedId, onSelect }: StaffFilterProps) {
	const t = useTranslations('staffSchedule')

	const handleValueChange = (value: string | null) => {
		if (!value) return
		onSelect(value)
	}

	return (
		<Select value={selectedId ?? undefined} onValueChange={handleValueChange}>
			<SelectTrigger className="w-full max-w-sm">
				<SelectValue placeholder={t('selectStaff')} />
			</SelectTrigger>
			<SelectContent>
				{staff.map(renderStaffOption)}
			</SelectContent>
		</Select>
	)
}

export { StaffFilter }
