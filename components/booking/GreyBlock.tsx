'use client'

import { minutesToPx, durationToPx } from '@/lib/calendar/utils'
import type { CalendarBlock } from '@/lib/calendar/types'

interface GreyBlockProps {
	block: CalendarBlock
	displayStart: number
}

function GreyBlock({ block, displayStart }: GreyBlockProps) {
	return (
		<div
			className="bg-muted pointer-events-none absolute right-0 left-12 cursor-default rounded-md"
			style={{
				top: minutesToPx(block.startMin, displayStart),
				height: durationToPx(block.duration),
				opacity: 0.6,
			}}
		/>
	)
}

export { GreyBlock }
