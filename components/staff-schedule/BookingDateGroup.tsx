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

function BookingDateGroup({ date, bookings, onBookingClick }: BookingDateGroupProps) {
	const renderItem = (booking: StaffBooking) => (
		<BookingListItem
			key={booking.id}
			booking={booking}
			onClick={onBookingClick}
		/>
	)

	return (
		<div className="flex flex-col gap-2">
			<h4 className="text-muted-foreground sticky top-0 bg-background py-1 text-xs font-semibold uppercase">
				{formatDateHeader(date)}
			</h4>
			<div className="flex flex-col gap-1">
				{bookings.map(renderItem)}
			</div>
		</div>
	)
}

export { BookingDateGroup }
