'use client'

import { Badge } from '@/components/ui/badge'
import type { StaffBooking, BookingStatus } from '@/services/configs/booking.types'

interface BookingListItemProps {
	booking: StaffBooking
	onClick: (booking: StaffBooking) => void
}

const STATUS_VARIANT: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	confirmed: 'default',
	pending_payment: 'secondary',
	completed: 'outline',
	no_show: 'secondary',
	cancelled: 'destructive',
}

const formatTime = (isoString: string): string =>
	new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function BookingListItem({ booking, onClick }: BookingListItemProps) {
	const handleClick = () => onClick(booking)

	return (
		<button
			type="button"
			onClick={handleClick}
			className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors"
		>
			<div className="flex items-center gap-3">
				<div
					className="size-2 shrink-0 rounded-full"
					style={{ backgroundColor: booking.color }}
				/>
				<div className="flex flex-col">
					<span className="text-sm font-medium">
						{formatTime(booking.startAt)} — {formatTime(booking.endAt)}
					</span>
					<span className="text-muted-foreground text-xs">
						{booking.eventTypeName}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-xs">{booking.invitee.name}</span>
				<Badge variant={STATUS_VARIANT[booking.status]} className="text-[10px]">
					{booking.status}
				</Badge>
			</div>
		</button>
	)
}

export { BookingListItem }
