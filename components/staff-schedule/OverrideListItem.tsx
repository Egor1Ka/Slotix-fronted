'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScheduleOverride } from '@/services/configs/booking.types'

interface OverrideListItemProps {
	override: ScheduleOverride
	readOnly: boolean
	isPast: boolean
	onDelete: (id: string) => Promise<void>
}

const formatDate = (dateStr: string): string => {
	const normalized = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00'
	return new Date(normalized).toLocaleDateString(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

const formatSlots = (slots: { start: string; end: string }[]): string =>
	slots.map((s) => `${s.start} — ${s.end}`).join(', ')

function OverrideListItem({
	override,
	readOnly,
	isPast,
	onDelete,
}: OverrideListItemProps) {
	const t = useTranslations('staffSchedule')
	const [isDeleting, setIsDeleting] = useState(false)

	const handleDelete = async () => {
		setIsDeleting(true)
		await onDelete(override.id)
		setIsDeleting(false)
	}

	const isPartialDayOff = !override.enabled && override.slots.length > 0
	const label = override.enabled
		? t('customHours')
		: isPartialDayOff
			? t('customHours')
			: t('dayOff')
	const variant = override.enabled
		? 'secondary'
		: isPartialDayOff
			? 'secondary'
			: 'destructive'
	const canDelete = !readOnly && !isPast

	return (
		<div
			data-slot="override-list-item"
			className={cn(
				'group flex items-center justify-between rounded-lg border p-3',
				'transition-shadow hover:shadow-sm',
				isPast && 'opacity-60',
			)}
		>
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">
						{formatDate(override.date)}
					</span>
					<Badge variant={variant} className="text-[10px]">
						{label}
					</Badge>
				</div>
				{override.slots.length > 0 && (
					<span className="text-muted-foreground text-xs">
						{formatSlots(override.slots)}
					</span>
				)}
				{override.reason && (
					<span className="text-muted-foreground text-xs italic">
						{override.reason}
					</span>
				)}
			</div>
			{canDelete && (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={handleDelete}
					disabled={isDeleting}
					className="opacity-0 transition-opacity group-hover:opacity-100"
				>
					<Trash2 className="size-4" />
				</Button>
			)}
		</div>
	)
}

export { OverrideListItem }
