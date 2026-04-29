'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
	value: number
	max?: number
	size?: 'sm' | 'md' | 'lg'
	onChange?: (value: number) => void
	disabled?: boolean
	className?: string
}

const SIZE_MAP = {
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-7',
}

const GAP_MAP = {
	sm: 'gap-1',
	md: 'gap-1.5',
	lg: 'gap-2',
}

const buildIndices = (max: number) =>
	Array.from({ length: max }, (_, i) => i + 1)

function RatingStars({
	value,
	max = 5,
	size = 'md',
	onChange,
	disabled = false,
	className,
}: RatingStarsProps) {
	const interactive = !!onChange && !disabled
	const indices = buildIndices(max)
	const [hovered, setHovered] = useState<number | null>(null)

	const activeValue = hovered ?? value

	const renderStar = (i: number) => {
		const filled = i <= activeValue
		const isHoverPreview = hovered !== null && i <= hovered
		const handleClick = () => {
			if (interactive && onChange) onChange(i)
		}
		const handleEnter = () => {
			if (interactive) setHovered(i)
		}
		const handleLeave = () => {
			if (interactive) setHovered(null)
		}
		return (
			<button
				key={i}
				type="button"
				onClick={handleClick}
				onMouseEnter={handleEnter}
				onMouseLeave={handleLeave}
				disabled={!interactive}
				aria-label={`Rate ${i}`}
				data-slot="rating-star"
				className={cn(
					'rounded-md transition-transform duration-150',
					interactive &&
						'hover:scale-115 cursor-pointer focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:outline-none',
					!interactive && 'cursor-default',
				)}
			>
				<Star
					className={cn(
						SIZE_MAP[size],
						'transition-all duration-200',
						filled
							? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.4)]'
							: 'text-muted-foreground/40 fill-transparent',
						isHoverPreview && 'scale-105',
					)}
				/>
			</button>
		)
	}

	return (
		<div
			data-slot="rating-stars"
			className={cn('inline-flex items-center', GAP_MAP[size], className)}
		>
			{indices.map(renderStar)}
		</div>
	)
}

export { RatingStars }
