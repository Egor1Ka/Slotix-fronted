'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StaffInfoSheet } from './StaffInfoSheet'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface StaffTabsProps {
	staff: OrgStaffMember[]
	selectedId: string | null
	behavior: 'select-one' | 'show-all'
	allowAll?: boolean
	onSelect: (id: string | null) => void
	loading?: boolean
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function StaffTabs({
	staff,
	selectedId,
	behavior,
	allowAll = false,
	onSelect,
	loading = false,
}: StaffTabsProps) {
	const t = useTranslations('booking')

	const isSelected = (member: OrgStaffMember): boolean =>
		selectedId === member.id

	const isActive = (member: OrgStaffMember): boolean =>
		behavior === 'show-all' || isSelected(member) || selectedId === null

	const handleClick = (member: OrgStaffMember) => () => {
		if (behavior === 'show-all') return
		const nextId = isSelected(member) ? null : member.id
		onSelect(nextId)
	}

	const handleAllClick = () => onSelect(null)
	const showAllTab = allowAll && behavior === 'select-one'
	const allActive = selectedId === null

	const renderTab = (member: OrgStaffMember) => (
		<div
			key={member.id}
			className={cn(
				'flex shrink-0 items-center gap-1 rounded-lg border-2 pr-1 transition-all',
				isSelected(member)
					? 'border-primary bg-primary/5'
					: isActive(member)
						? 'border-transparent'
						: 'text-muted-foreground border-transparent',
				behavior === 'select-one' && 'hover:bg-muted',
			)}
		>
			<button
				type="button"
				onClick={handleClick(member)}
				className={cn(
					'flex items-center gap-2 py-2 pl-3 pr-1',
					behavior === 'select-one' && 'cursor-pointer',
					behavior === 'show-all' && 'cursor-default',
				)}
			>
				<Avatar className="size-6">
					<AvatarImage src={member.avatar} alt={member.name} />
					<AvatarFallback className="text-[10px]">
						{getInitials(member.name)}
					</AvatarFallback>
				</Avatar>
				<div className="flex flex-col items-start">
					<span className="text-sm font-medium">{member.name}</span>
					{member.position && (
						<span className="text-muted-foreground text-[10px] leading-tight">
							{member.position}
						</span>
					)}
				</div>
			</button>
			<StaffInfoSheet
				staffId={member.id}
				name={member.name}
				avatar={member.avatar}
				position={member.position ?? null}
				bio={member.bio ?? null}
			/>
		</div>
	)

	return (
		<div
			className={cn(
				'flex gap-2 overflow-x-auto pb-2 transition-opacity',
				loading && 'pointer-events-none opacity-50',
			)}
		>
			{showAllTab && (
				<button
					type="button"
					onClick={handleAllClick}
					className={cn(
						'hover:bg-muted flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all',
						allActive
							? 'border-primary bg-primary/5'
							: 'text-muted-foreground border-transparent',
					)}
				>
					<span className="text-sm font-medium">{t('allStaff')}</span>
				</button>
			)}
			{staff.map(renderTab)}
		</div>
	)
}

export { StaffTabs }
