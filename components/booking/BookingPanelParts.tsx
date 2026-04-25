'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { EventType } from '@/services/configs/booking.types'
import { Separator } from '@/components/ui/separator'
import { wallClockInTz } from '@/lib/calendar/tz'

const pad2 = (n: number): string => String(n).padStart(2, '0')

const formatLocalTime = (iso: string, timezone: string): string => {
	const wc = wallClockInTz(iso, timezone)
	return `${pad2(wc.hour)}:${pad2(wc.minute)}`
}

function EmptyState({ message }: { message?: string }) {
	const t = useTranslations('booking')
	return (
		<div className="flex flex-col items-center justify-center py-8 text-center">
			<p className="text-muted-foreground text-sm">
				{message ?? t('selectService')}
			</p>
		</div>
	)
}

function ServiceInfo({ eventType }: { eventType: EventType }) {
	const t = useTranslations('booking')
	const tProfile = useTranslations('profile')
	const [expanded, setExpanded] = useState(false)

	const hasDescription =
		eventType.description && eventType.description.length > 0

	const toggleExpanded = () => setExpanded((prev) => !prev)

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<div
					className="size-3 rounded-full"
					style={{ backgroundColor: eventType.color }}
				/>
				<span className="text-sm font-semibold">{eventType.name}</span>
			</div>
			<div className="text-muted-foreground text-xs">
				{eventType.durationMin} {t('min')} · {eventType.price}{' '}
				{eventType.currency}
			</div>
			{hasDescription && (
				<>
					<Separator />
					<div className="text-muted-foreground min-w-0 text-xs leading-relaxed">
						<p className={expanded ? 'break-all' : 'line-clamp-3 break-all'}>
							{eventType.description}
						</p>
						<button
							type="button"
							onClick={toggleExpanded}
							className="text-primary mt-1 text-xs hover:underline"
						>
							{expanded ? tProfile('showLess') : tProfile('showMore')}
						</button>
					</div>
				</>
			)}
			<Separator />
			<p className="text-muted-foreground text-xs">{t('clickDashedZone')}</p>
		</div>
	)
}

export { EmptyState, ServiceInfo, formatLocalTime }
