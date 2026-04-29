'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingSummaryProps {
	avg: number | null
	count: number
	size?: 'sm' | 'md' | 'lg'
	variant?: 'plain' | 'badge'
	className?: string
}

const SIZE_ICON = {
	sm: 'size-3.5',
	md: 'size-4',
	lg: 'size-4.5',
}

const SIZE_TEXT = {
	sm: 'text-xs',
	md: 'text-sm',
	lg: 'text-sm',
}

const BADGE_BASE =
	'rounded-full bg-yellow-400/10 px-2 py-0.5 ring-1 ring-yellow-400/30'

function RatingSummary({
	avg,
	count,
	size = 'sm',
	variant = 'plain',
	className,
}: RatingSummaryProps) {
	const isEmpty = count === 0 || avg === null

	if (isEmpty) {
		return (
			<span
				data-slot="rating-summary-empty"
				className={cn(
					'text-muted-foreground inline-flex items-center gap-1',
					SIZE_TEXT[size],
					variant === 'badge' && BADGE_BASE,
					className,
				)}
			>
				<Star
					className={cn(
						SIZE_ICON[size],
						'text-muted-foreground/60 fill-transparent',
					)}
				/>
				<span className="font-medium">—</span>
			</span>
		)
	}

	return (
		<span
			data-slot="rating-summary"
			className={cn(
				'inline-flex items-center gap-1.5 font-semibold',
				SIZE_TEXT[size],
				variant === 'badge' && BADGE_BASE,
				className,
			)}
		>
			<Star
				className={cn(
					SIZE_ICON[size],
					'fill-yellow-400 text-yellow-400 drop-shadow-sm',
				)}
			/>
			<span>{avg.toFixed(1)}</span>
			<span className="text-muted-foreground/80 font-normal">({count})</span>
		</span>
	)
}

export { RatingSummary }
