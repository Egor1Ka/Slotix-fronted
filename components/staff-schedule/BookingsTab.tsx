'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { BookingDateGroup } from './BookingDateGroup'
import { BookingDetailPanel } from '@/components/booking/BookingDetailPanel'
import { bookingApi, eventTypeApi } from '@/lib/booking-api-client'
import type { StaffBooking, EventType } from '@/services/configs/booking.types'
import type { BookingDetail } from '@/components/booking/BookingDetailPanel'

interface BookingsTabProps {
	staffId: string
	orgId: string
	readOnly: boolean
}

const getWeekRange = (offset: number): { dateFrom: string; dateTo: string } => {
	const now = new Date()
	const monday = new Date(now)
	monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
	const sunday = new Date(monday)
	sunday.setDate(monday.getDate() + 6)

	const toISODate = (d: Date): string => d.toISOString().split('T')[0]

	return { dateFrom: toISODate(monday), dateTo: toISODate(sunday) }
}

const extractDate = (isoString: string): string => isoString.split('T')[0]

const groupByDate = (bookings: StaffBooking[]): Map<string, StaffBooking[]> => {
	const groups = new Map<string, StaffBooking[]>()

	const addToGroup = (booking: StaffBooking) => {
		const date = extractDate(booking.startAt)
		const existing = groups.get(date) ?? []
		groups.set(date, [...existing, booking])
	}

	bookings.forEach(addToGroup)
	return groups
}

const sortDatesAsc = (a: string, b: string): number => a.localeCompare(b)

const formatShort = (d: string): string =>
	new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
	})

const formatWeekLabel = (from: string, to: string): string =>
	`${formatShort(from)} — ${formatShort(to)}`

const toBookingDetail = (booking: StaffBooking): BookingDetail => ({
	id: booking.id,
	eventTypeName: booking.eventTypeName,
	color: booking.color,
	startAt: booking.startAt,
	endAt: booking.endAt,
	durationMin: Math.round(
		(new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) /
			60000,
	),
	date: extractDate(booking.startAt),
	status: booking.status,
	invitee: {
		name: booking.invitee.name,
		email: booking.invitee.email,
		phone: booking.invitee.phone,
	},
	payment: { status: 'unknown', amount: 0, currency: '' },
})

const renderDateGroup =
	(
		onBookingClick: (booking: StaffBooking) => void,
		grouped: Map<string, StaffBooking[]>,
	) =>
	(date: string) => (
		<BookingDateGroup
			key={date}
			date={date}
			bookings={grouped.get(date) ?? []}
			onBookingClick={onBookingClick}
		/>
	)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BookingsTab({ staffId, orgId, readOnly }: BookingsTabProps) {
	const t = useTranslations('staffSchedule')
	const [bookings, setBookings] = useState<StaffBooking[]>([])
	const [eventTypes, setEventTypes] = useState<EventType[]>([])
	const [loading, setLoading] = useState(true)
	const [weekOffset, setWeekOffset] = useState(0)
	const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(
		null,
	)

	const fetchData = useCallback(async () => {
		setLoading(true)
		try {
			const { dateFrom, dateTo } = getWeekRange(weekOffset)

			const types =
				eventTypes.length > 0 ? eventTypes : await eventTypeApi.getByOrg(orgId)

			if (eventTypes.length === 0) {
				setEventTypes(types)
			}

			const data = await bookingApi.getByStaff(staffId, dateFrom, dateTo, types)
			setBookings(data)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setLoading(false)
		}
	}, [staffId, orgId, weekOffset, eventTypes])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	const handlePrevWeek = () => setWeekOffset((prev) => prev - 1)
	const handleNextWeek = () => setWeekOffset((prev) => prev + 1)

	const handleBookingClick = (booking: StaffBooking) =>
		setSelectedBooking(booking)
	const handleCloseSheet = () => setSelectedBooking(null)

	const handleStatusChange = () => {
		setSelectedBooking(null)
		fetchData()
	}

	const { dateFrom, dateTo } = getWeekRange(weekOffset)
	const grouped = groupByDate(bookings)
	const sortedDates = [...grouped.keys()].sort(sortDatesAsc)

	return (
		<div data-slot="bookings-tab" className="flex flex-col gap-4">
			<div className="bg-muted/30 flex items-center justify-between rounded-lg p-1">
				<Button variant="ghost" size="sm" onClick={handlePrevWeek}>
					<ChevronLeft className="mr-1 size-4" />
					{t('prevWeek')}
				</Button>
				<span className="text-sm font-medium">
					{formatWeekLabel(dateFrom, dateTo)}
				</span>
				<Button variant="ghost" size="sm" onClick={handleNextWeek}>
					{t('nextWeek')}
					<ChevronRight className="ml-1 size-4" />
				</Button>
			</div>

			{loading ? (
				<div className="flex justify-center py-12">
					<Spinner className="size-6" />
				</div>
			) : sortedDates.length === 0 ? (
				<Empty className="rounded-xl border border-dashed py-12">
					<EmptyHeader>
						<CalendarX className="text-muted-foreground mx-auto mb-2 size-8" />
						<EmptyTitle>{t('noBookings')}</EmptyTitle>
						<EmptyDescription>{t('noBookingsHint')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="flex flex-col gap-4">
					{sortedDates.map(renderDateGroup(handleBookingClick, grouped))}
				</div>
			)}

			<Sheet open={selectedBooking !== null} onOpenChange={handleCloseSheet}>
				<SheetContent className="sm:max-w-md">
					<SheetHeader className="px-6 pt-6">
						<SheetTitle>{t('bookingDetails')}</SheetTitle>
					</SheetHeader>
					{selectedBooking && (
						<div className="px-6 pb-6">
							<BookingDetailPanel
								booking={toBookingDetail(selectedBooking)}
								onClose={handleCloseSheet}
								onStatusChange={handleStatusChange}
							/>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	)
}

export { BookingsTab }
