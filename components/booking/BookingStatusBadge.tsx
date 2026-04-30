'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

interface BookingStatusBadgeProps {
	status: BookingStatusObject
	className?: string
}

const buildBadgeStyle = (color: string) => ({
	backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
	color,
})

function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
	const t = useTranslations('booking')

	const label = status.isDefault
		? t(status.label as Parameters<typeof t>[0])
		: status.label

	return (
		<span
			data-slot="booking-status-badge"
			className={cn(
				'rounded-full px-2 py-0.5 text-xs font-medium',
				className,
			)}
			style={buildBadgeStyle(status.color)}
		>
			{label}
		</span>
	)
}

export { BookingStatusBadge }
