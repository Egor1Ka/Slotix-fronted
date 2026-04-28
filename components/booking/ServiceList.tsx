'use client'

import { useTranslations } from 'next-intl'
import { BanknoteIcon, ClockIcon, InfoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ServiceInfoSheet } from './ServiceInfoSheet'
import type { EventType } from '@/services/configs/booking.types'

const getInitial = (text: string) =>
	text.trim() ? text.trim().charAt(0).toUpperCase() : '?'

interface ServiceListProps {
	eventTypes: EventType[]
	selectedId: string | null
	onSelect: (eventTypeId: string) => void
	loading?: boolean
	variant?: 'vertical' | 'horizontal'
	allowedIds?: Set<string>
}

const SKELETON_ITEMS = [1, 2, 3, 4]

const renderSkeletonItem = (i: number) => (
	<div key={i} className="flex items-center gap-3 rounded-lg border p-3">
		<Skeleton className="size-10 shrink-0 rounded-md" />
		<div className="flex-1 space-y-1.5">
			<Skeleton className="h-3.5 w-24" />
			<Skeleton className="h-3 w-16" />
		</div>
	</div>
)

const renderSkeletonCard = (i: number) => (
	<div
		key={i}
		className="bg-card flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border"
	>
		<Skeleton className="aspect-video w-full rounded-none" />
		<div className="space-y-1.5 p-3">
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-3 w-1/2" />
		</div>
	</div>
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
		const handleBookFromSheet = () => onSelect(eventType.id)

		if (isHorizontal) {
			return (
				<div
					key={eventType.id}
					className={cn(
						'group bg-card relative flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg',
						isActive
							? 'border-primary ring-primary/40 shadow-md ring-2'
							: 'border-border',
						isDisabled &&
							'cursor-not-allowed opacity-40 hover:translate-y-0 hover:shadow-none',
					)}
				>
					<button
						type="button"
						onClick={handleClick}
						disabled={isDisabled}
						className="flex flex-col text-left disabled:cursor-not-allowed"
					>
						<div
							className="relative aspect-video w-full overflow-hidden"
							style={{ backgroundColor: eventType.color }}
						>
							{eventType.image ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={eventType.image}
									alt={eventType.name}
									className="size-full object-cover"
								/>
							) : (
								<div className="flex size-full items-center justify-center text-5xl font-bold text-white">
									{getInitial(eventType.name)}
								</div>
							)}
						</div>
						<div className="flex flex-col gap-1.5 px-4 py-2">
							<span className="line-clamp-2 text-base leading-tight font-semibold">
								{eventType.name}
							</span>
							<div className="flex flex-col">
								<span className="text-primary mt-0.5 inline-flex items-center gap-1.5 text-base font-bold">
									<BanknoteIcon className="size-4 shrink-0" />
									{eventType.price} {eventType.currency}
								</span>
								<span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
									<ClockIcon className="size-3.5 shrink-0" />
									{eventType.durationMin} {t('min')}
								</span>
							</div>
						</div>
					</button>
					<div className="absolute top-2 right-2">
						<ServiceInfoSheet
							eventType={eventType}
							onBook={isDisabled ? undefined : handleBookFromSheet}
						/>
					</div>
				</div>
			)
		}

		return (
			<div
				key={eventType.id}
				className={cn(
					'relative rounded-lg border transition-all',
					isActive
						? 'border-primary bg-primary/10 ring-primary/30 shadow-sm ring-2'
						: 'border-border hover:bg-muted',
					isDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
				)}
			>
				<button
					type="button"
					onClick={handleClick}
					disabled={isDisabled}
					className="flex w-full items-center gap-3 p-2 pr-9 text-left disabled:cursor-not-allowed"
				>
					<Avatar className="size-10 shrink-0 rounded-md">
						{eventType.image ? (
							<AvatarImage src={eventType.image} alt="" />
						) : null}
						<AvatarFallback
							className="text-sm"
							style={{ backgroundColor: eventType.color }}
						>
							{getInitial(eventType.name)}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<div className="line-clamp-2 text-base leading-tight font-medium">
							{eventType.name}
						</div>
						<div className="text-muted-foreground mt-1 text-sm">
							{eventType.durationMin} {t('min')} · {eventType.price}{' '}
							{eventType.currency}
						</div>
					</div>
				</button>
				<ServiceInfoSheet
					eventType={eventType}
					onBook={isDisabled ? undefined : handleBookFromSheet}
					trigger={
						<button
							type="button"
							aria-label={t('aboutService')}
							className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 flex size-7 items-center justify-center rounded-full transition-colors"
						>
							<InfoIcon className="size-3.5" />
						</button>
					}
				/>
			</div>
		)
	}

	const skeletonRenderer = isHorizontal
		? renderSkeletonCard
		: renderSkeletonItem
	const showSkeleton = eventTypes.length === 0 && loading

	return (
		<div
			className={cn(
				'gap-3 transition-opacity',
				loading && 'pointer-events-none opacity-50',
				isHorizontal ? 'flex overflow-x-auto px-1 pt-2 pb-2' : 'flex flex-col',
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
