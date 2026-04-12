'use client'

import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TimeSlotGrid } from './TimeSlotGrid'
import { StaffInfoSheet } from './StaffInfoSheet'
import type { Slot } from '@/lib/slot-engine'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface StaffSlotCardProps {
	staff: OrgStaffMember
	slots: Slot[]
	date: string
	selectedSlot: string | null
	selectedStaffId: string | null
	onSlotSelect: (staffId: string, time: string) => void
	loading?: boolean
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

const formatSlotDate = (dateStr: string, locale: string): string => {
	const date = new Date(dateStr + 'T00:00:00')
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const tomorrow = new Date(today)
	tomorrow.setDate(tomorrow.getDate() + 1)

	if (date.getTime() === today.getTime()) {
		return locale === 'uk' ? 'сьогодні' : 'today'
	}
	if (date.getTime() === tomorrow.getTime()) {
		return locale === 'uk' ? 'завтра' : 'tomorrow'
	}

	return date.toLocaleDateString(locale, {
		day: 'numeric',
		month: 'long',
		weekday: 'long',
	})
}

function StaffSlotCard({
	staff,
	slots,
	date,
	selectedSlot,
	selectedStaffId,
	onSlotSelect,
	loading = false,
}: StaffSlotCardProps) {
	const t = useTranslations('booking')
	const locale = useLocale()

	const isThisStaffSelected = selectedStaffId === staff.id
	const activeSlot = isThisStaffSelected ? selectedSlot : null

	const handleSlotSelect = (time: string) => {
		onSlotSelect(staff.id, time)
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Avatar className="size-10">
						<AvatarImage src={staff.avatar} alt={staff.name} />
						<AvatarFallback className="text-xs">
							{getInitials(staff.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="text-sm font-semibold">{staff.name}</span>
						{staff.position && (
							<span className="text-muted-foreground text-xs">
								{staff.position}
							</span>
						)}
					</div>
				</div>
				<StaffInfoSheet
					staffId={staff.id}
					name={staff.name}
					avatar={staff.avatar}
					position={staff.position}
					bio={staff.bio}
				/>
			</div>

			<p className="text-muted-foreground text-sm">
				{t('nearestTimeFor')}{' '}
				<span className="text-foreground font-medium">
					{formatSlotDate(date, locale)}
				</span>
			</p>

			<TimeSlotGrid
				slots={slots}
				selectedSlot={activeSlot}
				onSelect={handleSlotSelect}
				loading={loading}
			/>
		</div>
	)
}

export { StaffSlotCard }
