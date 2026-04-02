'use client'

import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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

function StaffOptionContent({ member }: { member: OrgStaffMember }) {
	const t = useTranslations('staffSchedule')

	return (
		<div className="flex items-center gap-2">
			<Avatar className="size-5">
				<AvatarImage src={member.avatar} alt={member.name} />
				<AvatarFallback className="text-[10px]">
					{getInitials(member.name)}
				</AvatarFallback>
			</Avatar>
			<span>{member.name}</span>
			{member.position && (
				<span className="text-muted-foreground text-xs">{member.position}</span>
			)}
			{member.status === 'invited' && (
				<Badge variant="outline" className="text-muted-foreground px-1.5 py-0 text-[10px]">
					{t('invited')}
				</Badge>
			)}
		</div>
	)
}

const findById = (
	staff: OrgStaffMember[],
	id: string | null,
): OrgStaffMember | undefined => staff.find((member) => member.id === id)

function StaffFilter({ staff, selectedId, onSelect }: StaffFilterProps) {
	const t = useTranslations('staffSchedule')

	const handleValueChange = (value: string | null) => {
		if (!value) return
		onSelect(value)
	}

	const renderStaffOption = (member: OrgStaffMember) => (
		<SelectItem key={member.id} value={member.id}>
			<StaffOptionContent member={member} />
		</SelectItem>
	)

	const selectedMember = findById(staff, selectedId)

	return (
		<div data-slot="staff-filter" className="flex items-center gap-2">
			<Users className="text-muted-foreground size-4 shrink-0" />
			<Select value={selectedId ?? undefined} onValueChange={handleValueChange}>
				<SelectTrigger className="w-full max-w-sm">
					{selectedMember ? (
						<StaffOptionContent member={selectedMember} />
					) : (
						<span className="text-muted-foreground">{t('selectStaff')}</span>
					)}
				</SelectTrigger>
				<SelectContent>{staff.map(renderStaffOption)}</SelectContent>
			</Select>
		</div>
	)
}

export { StaffFilter }
