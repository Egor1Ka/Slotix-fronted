'use client'

import { BookingListItem } from './BookingListItem'
import type { StaffBooking } from '@/services/configs/booking.types'

interface BookingDateGroupProps {
	date: string
	bookings: StaffBooking[]
	onBookingClick: (booking: StaffBooking) => void
}

const formatDateHeader = (dateStr: string): string =>
	new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	})

function BookingDateGroup({
	date,
	bookings,
	onBookingClick,
}: BookingDateGroupProps) {
	const renderItem = (booking: StaffBooking) => (
		<BookingListItem
			key={booking.id}
			booking={booking}
			onClick={onBookingClick}
		/>
	)

	return (
		<div data-slot="booking-date-group" className="flex flex-col gap-2">
			<div className="bg-muted/50 sticky top-0 z-10 -mx-1 rounded-md px-3 py-1.5">
				<h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
					{formatDateHeader(date)}
				</h4>
			</div>
			<div className="flex flex-col gap-1.5">{bookings.map(renderItem)}</div>
		</div>
	)
}

export { BookingDateGroup }
