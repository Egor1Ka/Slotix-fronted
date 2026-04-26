'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
	bookingApi,
	eventTypeApi,
	scheduleApi,
	bookingStatusApi,
} from '@/lib/booking-api-client'
import { getTodayStrInTz, getWeekStart, addDays } from '@/lib/calendar/utils'
import { dateFromISO } from '@/lib/booking-utils'
import type { StaffBooking, EventType } from '@/services/configs/booking.types'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'
import type { BookingDetail } from '@/components/booking/BookingDetailPanel'

interface BookingsTabProps {
	staffId: string
	orgId?: string
	readOnly: boolean
}

const computeWeekRange = (
	offset: number,
	timezone: string,
): { dateFrom: string; dateTo: string } => {
	const todayStr = getTodayStrInTz(timezone)
	const baseMonday = getWeekStart(todayStr, timezone)
	const monday = addDays(baseMonday, offset * 7)
	const sunday = addDays(monday, 6)
	return { dateFrom: monday, dateTo: sunday }
}

const groupByDate = (
	bookings: StaffBooking[],
	timezone: string,
): Map<string, StaffBooking[]> => {
	const groups = new Map<string, StaffBooking[]>()

	const addToGroup = (booking: StaffBooking) => {
		const date = dateFromISO(booking.startAt, timezone)
		const existing = groups.get(date) ?? []
		groups.set(date, [...existing, booking])
	}

	bookings.forEach(addToGroup)
	return groups
}

const sortDatesAsc = (a: string, b: string): number => a.localeCompare(b)

const formatShort = (dateStr: string, timezone: string): string =>
	new Date(dateStr + 'T12:00:00Z').toLocaleDateString('uk-UA', {
		// tz-ok: timeZone: timezone passed in options on next line
		timeZone: timezone,
		day: 'numeric',
		month: 'short',
	})

const formatWeekLabel = (from: string, to: string, timezone: string): string =>
	`${formatShort(from, timezone)} — ${formatShort(to, timezone)}`

const toBookingDetail = (
	booking: StaffBooking,
	timezone: string,
): BookingDetail => ({
	id: booking.id,
	eventTypeName: booking.eventTypeName,
	color: booking.color,
	startAt: booking.startAt,
	endAt: booking.endAt,
	timezone: booking.timezone,
	durationMin: Math.round(
		(new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) /
			60000,
	),
	date: dateFromISO(booking.startAt, timezone),
	statusId: booking.statusId,
	status: booking.status,
	invitee: {
		name: booking.invitee.name,
		email: booking.invitee.email,
		phone: booking.invitee.phone,
	},
	payment: booking.payment,
})

const renderDateGroup = (
	onBookingClick: (booking: StaffBooking) => void,
	grouped: Map<string, StaffBooking[]>,
	timezone: string,
) => {
	const DateGroupItem = (date: string) => (
		<BookingDateGroup
			key={date}
			date={date}
			timezone={timezone}
			bookings={grouped.get(date) ?? []}
			onBookingClick={onBookingClick}
		/>
	)
	DateGroupItem.displayName = 'DateGroupItem'
	return DateGroupItem
}

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

	const eventTypesRef = useRef<EventType[]>([])
	const timezoneRef = useRef<string | null>(null)

	const [eventTypesReady, setEventTypesReady] = useState(false)
	const [availableStatuses, setAvailableStatuses] = useState<
		BookingStatusObject[]
	>([])

	useEffect(() => {
		const loadStatuses = async () => {
			try {
				const statuses = await bookingStatusApi.getAll(orgId)
				setAvailableStatuses(statuses)
			} catch {
				// обрабатывается интерцептором toast
			}
		}
		loadStatuses()
	}, [orgId])

	useEffect(() => {
		const loadEventTypes = async () => {
			const fetchTypes = orgId
				? () => eventTypeApi.getByOrg(orgId)
				: () => eventTypeApi.getByStaff(staffId, orgId)
			const [types, schedule] = await Promise.all([
				fetchTypes(),
				scheduleApi.getTemplate(staffId, orgId).catch(() => null),
			])
			eventTypesRef.current = types
			timezoneRef.current = schedule?.timezone ?? null
			setEventTypes(types)
			setEventTypesReady(true)
		}
		setEventTypesReady(false)
		loadEventTypes()
	}, [staffId, orgId])

	const fetchData = useCallback(async () => {
		const timezone = timezoneRef.current
		if (!timezone) return
		setLoading(true)
		try {
			const { dateFrom, dateTo } = computeWeekRange(weekOffset, timezone)
			const data = await bookingApi.getByStaff(
				staffId,
				dateFrom,
				dateTo,
				timezone,
				eventTypesRef.current,
				undefined,
				undefined,
				orgId,
			)
			setBookings(data)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setLoading(false)
		}
	}, [staffId, weekOffset, orgId])

	useEffect(() => {
		if (eventTypesReady) {
			fetchData()
		}
	}, [fetchData, eventTypesReady])

	const handlePrevWeek = () => setWeekOffset((prev) => prev - 1)
	const handleNextWeek = () => setWeekOffset((prev) => prev + 1)

	const handleBookingClick = (booking: StaffBooking) =>
		setSelectedBooking(booking)
	const handleCloseSheet = () => setSelectedBooking(null)

	const handleStatusChange = (_bookingId: string, _newStatusId: string) => {
		setSelectedBooking(null)
		fetchData()
	}

	const timezone = timezoneRef.current
	if (!timezone) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-6" />
			</div>
		)
	}

	const { dateFrom, dateTo } = computeWeekRange(weekOffset, timezone)
	const grouped = groupByDate(bookings, timezone)
	const sortedDates = [...grouped.keys()].sort(sortDatesAsc)

	return (
		<div data-slot="bookings-tab" className="flex flex-col gap-4">
			<div className="bg-muted/30 flex items-center justify-between rounded-lg p-1">
				<Button variant="ghost" size="sm" onClick={handlePrevWeek}>
					<ChevronLeft className="mr-1 size-4" />
					{t('prevWeek')}
				</Button>
				<span className="text-sm font-medium">
					{formatWeekLabel(dateFrom, dateTo, timezone)}
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
					{sortedDates.map(
						renderDateGroup(handleBookingClick, grouped, timezone),
					)}
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
								booking={toBookingDetail(selectedBooking, timezone)}
								availableStatuses={availableStatuses}
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
