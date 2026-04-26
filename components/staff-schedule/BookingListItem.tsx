'use client'

import { cn } from '@/lib/utils'
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import type { StaffBooking } from '@/services/configs/booking.types'

interface BookingListItemProps {
	booking: StaffBooking
	timezone: string
	onClick: (booking: StaffBooking) => void
}

const formatTime = (isoString: string, timezone: string): string =>
	new Date(isoString).toLocaleTimeString('uk-UA', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

function BookingListItem({ booking, timezone, onClick }: BookingListItemProps) {
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
						{formatTime(booking.startAt, timezone)} —{' '}
						{formatTime(booking.endAt, timezone)}
					</span>
					<span className="text-muted-foreground truncate text-xs">
						{booking.eventTypeName}
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span className="text-muted-foreground hidden text-xs sm:inline">
						{booking.invitee.name}
					</span>
					<BookingStatusBadge status={booking.status} className="text-[10px]" />
				</div>
			</div>
		</button>
	)
}

export { BookingListItem }
