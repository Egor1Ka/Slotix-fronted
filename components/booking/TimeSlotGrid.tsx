'use client'

import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import type { Slot } from '@/lib/slot-engine'

interface TimeSlotGridProps {
	slots: Slot[]
	selectedSlot: string | null
	onSelect: (time: string) => void
	loading?: boolean
	disabled?: boolean
}

const SKELETON_ITEMS = [1, 2, 3, 4, 5, 6]

const renderSkeletonSlot = (i: number) => (
	<Skeleton key={i} className="h-10 rounded-full" />
)

function TimeSlotGrid({
	slots,
	selectedSlot,
	onSelect,
	loading = false,
	disabled = false,
}: TimeSlotGridProps) {
	const t = useTranslations('booking')

	if (loading) {
		return (
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{SKELETON_ITEMS.map(renderSkeletonSlot)}
			</div>
		)
	}

	if (slots.length === 0) {
		return (
			<p className="text-muted-foreground py-4 text-center text-sm">
				{t('noSlotsAvailable')}
			</p>
		)
	}

	const renderSlot = (slot: Slot) => {
		const isActive = !disabled && slot.startTime === selectedSlot
		const handleClick = () => {
			if (!disabled) onSelect(slot.startTime)
		}

		return (
			<button
				key={slot.startTime}
				type="button"
				onClick={handleClick}
				disabled={disabled}
				className={cn(
					'rounded-full border px-4 py-2.5 text-sm font-medium transition-all',
					disabled && 'cursor-default opacity-60',
					isActive
						? 'border-primary bg-primary text-primary-foreground shadow-sm'
						: 'border-border bg-muted/50 hover:bg-muted',
				)}
			>
				{slot.startTime}
			</button>
		)
	}

	return (
		<div
			className={cn(
				'grid grid-cols-2 gap-2 sm:grid-cols-3',
				loading && 'pointer-events-none opacity-50',
			)}
		>
			{slots.map(renderSlot)}
		</div>
	)
}

export { TimeSlotGrid }
