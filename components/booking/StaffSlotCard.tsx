'use client'

import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TimeSlotGrid } from './TimeSlotGrid'
import { StaffInfoSheet } from './StaffInfoSheet'
import { todayInTz } from '@/lib/calendar/tz'
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
	scheduleTimezone: string
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

const addDays = (dateStr: string, days: number): string => {
	const date = new Date(dateStr + 'T00:00:00Z')
	date.setUTCDate(date.getUTCDate() + days)
	return date.toISOString().slice(0, 10)
}

const formatSlotDate = (
	dateStr: string,
	locale: string,
	scheduleTimezone: string,
): string => {
	const todayStr = todayInTz(scheduleTimezone)
	const tomorrowStr = addDays(todayStr, 1)

	if (dateStr === todayStr) {
		return locale === 'uk' ? 'сьогодні' : 'today'
	}
	if (dateStr === tomorrowStr) {
		return locale === 'uk' ? 'завтра' : 'tomorrow'
	}

	const date = new Date(dateStr + 'T00:00:00')
	return date.toLocaleDateString(locale, {
		// tz-ok: date constructed from tz-correct YYYY-MM-DD+'T00:00:00'; displaying day/month/weekday labels, tz shift within same day is harmless
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
	scheduleTimezone,
}: StaffSlotCardProps) {
	const t = useTranslations('booking')
	const locale = useLocale()

	const isThisStaffSelected = selectedStaffId === staff.id
	const activeSlot = isThisStaffSelected ? selectedSlot : null

	const handleSlotSelect = (time: string) => {
		onSlotSelect(staff.id, time)
	}

	return (
		<div className="bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Avatar className="ring-border size-12 ring-2">
						<AvatarImage src={staff.avatar} alt={staff.name} />
						<AvatarFallback className="text-sm">
							{getInitials(staff.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="text-base font-semibold">{staff.name}</span>
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
					{formatSlotDate(date, locale, scheduleTimezone)}
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
