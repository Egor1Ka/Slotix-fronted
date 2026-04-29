'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ratingApi } from '@/services'
import type { RatingSummary, RatingTargetType } from '@/services'
import { RatingStars } from './RatingStars'

interface MyRatingControlProps {
	targetType: RatingTargetType
	targetId: string
	value: number | null
	onChange: (summary: RatingSummary) => void
}

function MyRatingControl({
	targetType,
	targetId,
	value,
	onChange,
}: MyRatingControlProps) {
	const t = useTranslations('reviews')
	const [busy, setBusy] = useState(false)

	const handleSet = async (next: number) => {
		if (busy) return
		setBusy(true)
		try {
			const response = await ratingApi.set({
				pathParams: { targetType, targetId },
				body: { value: next },
			})
			onChange(response.data)
		} finally {
			setBusy(false)
		}
	}

	const handleRemove = async () => {
		if (busy) return
		setBusy(true)
		try {
			const response = await ratingApi.remove({
				pathParams: { targetType, targetId },
			})
			onChange(response.data)
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="bg-muted/30 ring-border/50 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1">
			<div className="flex flex-col gap-0.5">
				<span className="text-foreground text-xs font-semibold tracking-wide uppercase">
					{t('yourRating')}
				</span>
				<RatingStars
					value={value ?? 0}
					onChange={handleSet}
					disabled={busy}
					size="md"
				/>
			</div>
			{value ? (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={handleRemove}
					disabled={busy}
					aria-label={t('removeRating')}
					className="text-muted-foreground hover:text-destructive"
				>
					<X className="size-4" />
				</Button>
			) : null}
		</div>
	)
}

export { MyRatingControl }
