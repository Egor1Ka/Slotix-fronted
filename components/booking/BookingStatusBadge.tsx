'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

interface BookingStatusBadgeProps {
	status: BookingStatusObject
	className?: string
}

const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
	blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
	green: { bg: 'bg-green-100', text: 'text-green-800' },
	red: { bg: 'bg-red-100', text: 'text-red-800' },
	yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
	purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
	orange: { bg: 'bg-orange-100', text: 'text-orange-800' },
	gray: { bg: 'bg-gray-100', text: 'text-gray-800' },
	teal: { bg: 'bg-teal-100', text: 'text-teal-800' },
}

const DEFAULT_COLOR = { bg: 'bg-gray-100', text: 'text-gray-800' }

function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
	const t = useTranslations('booking')
	const colorCfg = COLOR_CLASSES[status.color] ?? DEFAULT_COLOR

	const label = status.isDefault
		? t(status.label as Parameters<typeof t>[0])
		: status.label

	return (
		<span
			data-slot="booking-status-badge"
			className={cn(
				'rounded-full px-2 py-0.5 text-xs font-medium',
				colorCfg.bg,
				colorCfg.text,
				className,
			)}
		>
			{label}
		</span>
	)
}

export { BookingStatusBadge }
