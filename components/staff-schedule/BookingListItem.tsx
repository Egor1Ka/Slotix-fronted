'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
	StaffBooking,
	BookingStatus,
} from '@/services/configs/booking.types'

interface BookingListItemProps {
	booking: StaffBooking
	onClick: (booking: StaffBooking) => void
}

const STATUS_VARIANT: Record<
	BookingStatus,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	confirmed: 'default',
	pending_payment: 'secondary',
	completed: 'outline',
	no_show: 'secondary',
	cancelled: 'destructive',
}

const formatTime = (isoString: string): string =>
	new Date(isoString).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	})

function BookingListItem({ booking, onClick }: BookingListItemProps) {
	const handleClick = () => onClick(booking)

	return (
		<button
			type="button"
			data-slot="booking-list-item"
			onClick={handleClick}
			className={cn(
				'group relative flex w-full items-center gap-3 rounded-lg border p-3 text-left',
				'transition-shadow hover:shadow-sm',
			)}
		>
			<div
				className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
				style={{ backgroundColor: booking.color }}
			/>
			<div className="flex min-w-0 flex-1 items-center justify-between gap-2 pl-1">
				<div className="flex min-w-0 flex-col">
					<span className="text-sm font-medium">
						{formatTime(booking.startAt)} — {formatTime(booking.endAt)}
					</span>
					<span className="text-muted-foreground truncate text-xs">
						{booking.eventTypeName}
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span className="text-muted-foreground hidden text-xs sm:inline">
						{booking.invitee.name}
					</span>
					<Badge
						variant={STATUS_VARIANT[booking.status]}
						className="text-[10px]"
					>
						{booking.status}
					</Badge>
				</div>
			</div>
		</button>
	)
}

export { BookingListItem }
