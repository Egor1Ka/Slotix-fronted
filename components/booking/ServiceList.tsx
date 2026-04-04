'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { EventType } from '@/services/configs/booking.types'

interface ServiceListProps {
	eventTypes: EventType[]
	selectedId: string | null
	onSelect: (eventTypeId: string) => void
	loading?: boolean
}

const SKELETON_ITEMS = [1, 2, 3]

const renderSkeletonItem = (i: number) => (
	<div key={i} className="flex items-center gap-3 rounded-lg border p-3">
		<Skeleton className="size-3 shrink-0 rounded-full" />
		<div className="flex-1 space-y-1.5">
			<Skeleton className="h-3.5 w-24" />
			<Skeleton className="h-3 w-16" />
		</div>
	</div>
)

function ServiceList({
	eventTypes,
	selectedId,
	onSelect,
	loading = false,
}: ServiceListProps) {
	const t = useTranslations('booking')

	const renderEventType = (eventType: EventType) => {
		const isActive = eventType.id === selectedId
		const handleClick = () => onSelect(eventType.id)

		return (
			<button
				key={eventType.id}
				type="button"
				onClick={handleClick}
				className={cn(
					'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
					isActive
						? 'border-primary bg-primary/10 ring-primary/30 shadow-sm ring-2'
						: 'border-border hover:bg-muted',
				)}
			>
				<div
					className="size-3 shrink-0 rounded-full"
					style={{ backgroundColor: eventType.color }}
				/>
				<div className="flex-1">
					<div className="text-sm font-medium">{eventType.name}</div>
					<div className="text-muted-foreground text-xs">
						{eventType.durationMin} {t('min')} · {eventType.price}{' '}
						{eventType.currency}
					</div>
				</div>
			</button>
		)
	}

	return (
		<div
			className={cn(
				'flex flex-col gap-2 transition-opacity',
				loading && 'pointer-events-none opacity-50',
			)}
		>
			<h3 className="text-muted-foreground text-sm font-medium">
				{t('services')}
			</h3>
			{eventTypes.length === 0 && loading
				? SKELETON_ITEMS.map(renderSkeletonItem)
				: eventTypes.map(renderEventType)}
		</div>
	)
}

export { ServiceList }
