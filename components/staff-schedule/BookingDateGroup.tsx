'use client'

import { BookingListItem } from './BookingListItem'
import type { StaffBooking } from '@/services/configs/booking.types'

interface BookingDateGroupProps {
	date: string
	timezone: string
	bookings: StaffBooking[]
	onBookingClick: (booking: StaffBooking) => void
}

const formatDateHeader = (dateStr: string, timezone: string): string =>
	new Date(dateStr + 'T12:00:00Z').toLocaleDateString('uk-UA', {
		timeZone: timezone,
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	})

function BookingDateGroup({
	date,
	timezone,
	bookings,
	onBookingClick,
}: BookingDateGroupProps) {
	const renderItem = (booking: StaffBooking) => (
		<BookingListItem
			key={booking.id}
			booking={booking}
			timezone={timezone}
			onClick={onBookingClick}
		/>
	)

	return (
		<div data-slot="booking-date-group" className="flex flex-col gap-2">
			<div className="bg-muted/50 sticky top-0 z-10 -mx-1 rounded-md px-3 py-1.5">
				<h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
					{formatDateHeader(date, timezone)}
				</h4>
			</div>
			<div className="flex flex-col gap-1.5">{bookings.map(renderItem)}</div>
		</div>
	)
}

export { BookingDateGroup }
