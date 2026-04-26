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
	variant?: 'vertical' | 'horizontal'
	allowedIds?: Set<string>
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

const renderSkeletonChip = (i: number) => (
	<Skeleton key={i} className="h-14 w-44 shrink-0 rounded-2xl" />
)

function ServiceList({
	eventTypes,
	selectedId,
	onSelect,
	loading = false,
	variant = 'vertical',
	allowedIds,
}: ServiceListProps) {
	const t = useTranslations('booking')

	const isHorizontal = variant === 'horizontal'

	const renderEventType = (eventType: EventType) => {
		const isActive = eventType.id === selectedId
		const isDisabled = allowedIds ? !allowedIds.has(eventType.id) : false
		const handleClick = () => onSelect(eventType.id)

		if (isHorizontal) {
			return (
				<button
					key={eventType.id}
					type="button"
					onClick={handleClick}
					disabled={isDisabled}
					className={cn(
						'group bg-card flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
						isActive
							? 'border-primary bg-primary/5 ring-primary/40 shadow-md ring-2'
							: 'border-border',
						isDisabled &&
							'cursor-not-allowed opacity-40 hover:translate-y-0 hover:shadow-none',
					)}
				>
					<div
						className="size-3 shrink-0 rounded-full"
						style={{ backgroundColor: eventType.color }}
					/>
					<div className="flex flex-col">
						<span className="text-sm leading-tight font-semibold">
							{eventType.name}
						</span>
						<span className="text-muted-foreground text-xs leading-tight">
							{eventType.durationMin} {t('min')} · {eventType.price}{' '}
							{eventType.currency}
						</span>
					</div>
				</button>
			)
		}

		return (
			<button
				key={eventType.id}
				type="button"
				onClick={handleClick}
				disabled={isDisabled}
				className={cn(
					'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
					isActive
						? 'border-primary bg-primary/10 ring-primary/30 shadow-sm ring-2'
						: 'border-border hover:bg-muted',
					isDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
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

	const skeletonRenderer = isHorizontal
		? renderSkeletonChip
		: renderSkeletonItem
	const showSkeleton = eventTypes.length === 0 && loading

	return (
		<div
			className={cn(
				'gap-3 transition-opacity',
				loading && 'pointer-events-none opacity-50',
				isHorizontal
					? 'flex overflow-x-auto px-1 pt-1.5 pb-3'
					: 'flex flex-col',
			)}
		>
			{!isHorizontal && (
				<h3 className="text-muted-foreground text-sm font-medium">
					{t('services')}
				</h3>
			)}
			{showSkeleton
				? SKELETON_ITEMS.map(skeletonRenderer)
				: eventTypes.map(renderEventType)}
		</div>
	)
}

export { ServiceList }
