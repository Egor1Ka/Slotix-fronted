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
	<Skeleton key={i} className="h-12 rounded-xl" />
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
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
					'rounded-xl border px-4 py-3 text-base font-semibold transition-all',
					disabled && 'cursor-default opacity-60',
					isActive
						? 'border-primary bg-primary text-primary-foreground scale-[1.02] shadow-md'
						: 'border-border bg-muted/40 hover:bg-muted hover:-translate-y-0.5 hover:shadow-sm',
				)}
			>
				{slot.startTime}
			</button>
		)
	}

	return (
		<div
			className={cn(
				'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
				loading && 'pointer-events-none opacity-50',
			)}
		>
			{slots.map(renderSlot)}
		</div>
	)
}

export { TimeSlotGrid }
