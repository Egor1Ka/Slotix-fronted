'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { saveBookingSuccess } from '@/lib/booking/booking-success-storage'
import type { ConfirmedBooking } from '@/lib/calendar/types'
import {
	type ViewMode,
	CalendarProvider,
	CalendarCore,
	createClientStrategy,
	createStaffStrategy,
} from '@/lib/calendar'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { useViewConfig } from '@/lib/calendar/CalendarViewConfigContext'
import { getWorkHoursForDate, getFirstStaffId } from '@/lib/calendar/utils'
import { SlotListView } from '@/components/booking/SlotListView'
import { BookingFlowDialog } from '@/components/booking/BookingFlowDialog'
import { buildShareUrl } from '@/lib/booking/build-share-url'
import type { ProfileInfoBlockProps } from '@/components/booking/ProfileInfoBlock'
import {
	useStaffBySlug,
	useStaffSchedule,
	useStaffBookings,
	useCalendarNavigation,
	useBookingActions,
} from '@/lib/calendar/hooks'
import type { OrgStaffMember } from '@/services/configs/booking.types'
import { bookingStatusApi } from '@/lib/booking-api-client'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

// ── Module-level constants ──

const todayStr = (): string =>
	new Intl.DateTimeFormat('en-CA').format(new Date())

const isDisabledDay = (wh: { dayOfWeek: number; enabled: boolean }): boolean =>
	!wh.enabled
const toDayOfWeek = (wh: { dayOfWeek: number }): number => wh.dayOfWeek

const toStaffMember = (staff: {
	id: string
	name: string
	avatar?: string
	position?: string | null
	bio?: string | null
}): OrgStaffMember => ({
	id: staff.id,
	name: staff.name,
	avatar: staff.avatar ?? '',
	position: staff.position ?? null,
	bio: staff.bio ?? null,
	bookingCount: 0,
})

// ── Component ──

interface BookingPageProps {
	staffSlug: string
	publicUrl?: string
	hideSidebar?: boolean
}

function BookingPage({
	staffSlug,
	publicUrl,
	hideSidebar = false,
}: BookingPageProps) {
	const searchParams = useSearchParams()
	const router = useRouter()
	const viewConfig = useViewConfig()
	const canBookForClient = viewConfig.canBookForClient
	const t = useTranslations('booking')
	const tCalendar = useTranslations('calendar')
	const locale = useLocale()

	// ── URL state ──

	const dateStr = searchParams.get('date') ?? todayStr()
	const view = (searchParams.get('view') as ViewMode) ?? viewConfig.defaultView
	const selectedEventTypeId = searchParams.get('eventType')
	const selectedSlotTime = searchParams.get('slot')

	const [bookingDialogOpen, setBookingDialogOpen] = useState(false)

	// ── Data ──

	const {
		staff,
		loading: staffLoading,
		error: staffError,
	} = useStaffBySlug(staffSlug)

	const {
		eventTypes,
		schedule,
		overrides: staffOverrides,
		reloadSchedule,
		loading: scheduleLoading,
		error: scheduleError,
	} = useStaffSchedule(staff?.id ?? null)

	const staffToLoad = useMemo(() => {
		if (!staff) return []
		return [toStaffMember(staff)]
	}, [staff])

	const {
		bookings,
		staffBookingsMap,
		reloadBookings,
		loading: bookingsLoading,
		error: bookingsError,
	} = useStaffBookings(
		staffToLoad,
		dateStr,
		view,
		eventTypes,
		undefined,
		schedule?.timezone,
	)

	const [availableStatuses, setAvailableStatuses] = useState<
		BookingStatusObject[]
	>([])

	useEffect(() => {
		if (!staff) return
		const loadStatuses = async () => {
			try {
				const statuses = await bookingStatusApi.getAll()
				setAvailableStatuses(statuses)
			} catch {
				// обрабатывается интерцептором toast
			}
		}
		loadStatuses()
	}, [staff?.id])

	const loading = staffLoading || scheduleLoading || bookingsLoading
	const error = staffError || scheduleError || bookingsError

	// ── Navigation ──

	const navigation = useCalendarNavigation({ dateStr, selectedEventTypeId })

	// ── Booking actions ──

	const bookingActions = useBookingActions(
		{
			staffId: staff?.id ?? null,
			staffList: staffToLoad,
			eventTypes,
			selectedEventTypeId,
			selectedSlotTime,
			dateStr,
			timezone: schedule?.timezone ?? '',
			reloadBookings,
			getFirstStaffId,
			t,
		},
		navigation.setParams,
	)

	// ── Navigation wrappers (reset booking state on navigation) ──

	const resetBookingState = () => {
		bookingActions.setBookingError(null)
		bookingActions.handleBookingClose()
	}

	const onDateChange = (newDate: string) => {
		navigation.handleDateChange(newDate)
		resetBookingState()
	}

	const onDayClick = (newDate: string) => {
		navigation.handleDayClick(newDate)
		resetBookingState()
	}

	const onEventTypeSelect = (eventTypeId: string) => {
		navigation.handleEventTypeSelect(eventTypeId)
		resetBookingState()
	}

	const onSlotSelect = (time: string, slotDate?: string) => {
		navigation.handleSlotSelect(time, slotDate)
		bookingActions.handleBookingClose()
		setBookingDialogOpen(true)
	}

	// ── Guards ──

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">{t('loading')}</p>
			</div>
		)
	}

	if (error || !staff) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-destructive text-sm">{error ?? t('loadError')}</p>
			</div>
		)
	}

	if (!schedule) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">{t('loading')}</p>
			</div>
		)
	}

	// ── Profile info ──

	const profileInfo: ProfileInfoBlockProps | undefined = publicUrl
		? undefined
		: {
				name: staff.name,
				logo: null,
				avatar: staff.avatar ?? null,
				description: staff.description ?? null,
				address: staff.address ?? null,
				phone: staff.phone ?? null,
				website: staff.website ?? null,
				isOrg: false,
			}

	// ── Derived data ──

	const workHours = getWorkHoursForDate(
		schedule.weeklyHours,
		dateStr,
		schedule.timezone,
	)
	const isDayOff = workHours === null
	const workStart = workHours?.workStart ?? '10:00'
	const workEnd = workHours?.workEnd ?? '18:00'
	const disabledDays = schedule.weeklyHours
		.filter(isDisabledDay)
		.map(toDayOfWeek)

	// ── Strategy ──

	const strategy = canBookForClient
		? createStaffStrategy({
				staffName: staff?.name ?? tCalendar('mySchedule'),
				locale,
				eventTypes,
				bookings,
				schedule: schedule,
				overrides: staffOverrides,
				staffId: staff?.id,
				selectedEventTypeId,
				selectedSlot: selectedSlotTime,
				date: dateStr,
				onSelectEventType: onEventTypeSelect,
				onSelectSlot: onSlotSelect,
				onBookingClick: bookingActions.handleBookingSelect,
				selectedBooking: bookingActions.selectedBooking,
				onCloseBooking: bookingActions.handleBookingClose,
				onBookingStatusChange: bookingActions.handleBookingStatusChange,
				onBookingReschedule: bookingActions.handleBookingReschedule,
				availableStatuses,
			})
		: createClientStrategy({
				eventTypes,
				bookings,
				schedule: schedule,
				overrides: staffOverrides,
				staffId: staff.id,
				staffName: staff.name,
				locale,
				selectedEventTypeId,
				selectedSlot: selectedSlotTime,
				date: dateStr,
				onSelectEventType: onEventTypeSelect,
				onSelectSlot: onSlotSelect,
			})

	// ── List view slot ──

	const staffRawBookings = staff ? (staffBookingsMap[staff.id] ?? []) : []

	const dialogShareUrl =
		typeof window !== 'undefined'
			? buildShareUrl({
					origin: window.location.origin,
					variant: 'personal',
					staffId: staff.id,
				})
			: ''

	const findEventTypeById = (id: string | null) =>
		eventTypes.find((et) => et.id === id) ?? null
	const dialogEventType = findEventTypeById(selectedEventTypeId)

	const handleDialogOpenChange = (next: boolean) => {
		setBookingDialogOpen(next)
		if (!next) navigation.setParams({ slot: null })
	}

	const handleDialogBookAgain = () => {
		setBookingDialogOpen(false)
		navigation.setParams({ eventType: null, slot: null })
	}

	const isDialogOpen =
		bookingDialogOpen && !!selectedEventTypeId && !!selectedSlotTime

	// ── Success navigation (only public users) ──

	const returnUrl = viewConfig.isPublicBookingPage
		? `/${locale}/book/${staffSlug}`
		: ''

	const handleSuccessNavigate = (result: ConfirmedBooking) => {
		saveBookingSuccess({
			result,
			staffName: staff.name,
			staffAvatar: staff.avatar ?? null,
			returnUrl,
		})
		router.push(`/${locale}/booking/success`)
	}

	const navigateOnSuccess = viewConfig.isPublicBookingPage
		? handleSuccessNavigate
		: undefined

	const listViewSlot = (
		<SlotListView
			variant="personal"
			eventTypes={eventTypes}
			selectedEventTypeId={selectedEventTypeId}
			onEventTypeSelect={onEventTypeSelect}
			loading={loading}
			schedule={schedule}
			overrides={staffOverrides}
			bookings={staffRawBookings}
			staffId={staff?.id}
			dateStr={dateStr}
			onDateChange={onDateChange}
			formConfig={bookingActions.formConfig}
			onConfirmWithClient={bookingActions.handleConfirmWithClient}
			isSubmitting={bookingActions.isSubmitting}
			shareUrl={dialogShareUrl}
			onBookAgain={handleDialogBookAgain}
			onSuccessNavigate={navigateOnSuccess}
		/>
	)

	// ── Render ──

	return (
		<CalendarProvider strategy={strategy}>
			<CalendarCore
				date={dateStr}
				view={view}
				onViewChange={navigation.handleViewChange}
				onDateChange={onDateChange}
				onDayClick={onDayClick}
				workStart={workStart}
				workEnd={workEnd}
				isDayOff={isDayOff}
				disabledDays={disabledDays}
				publicUrl={publicUrl}
				staffAvatarUrl={staff?.avatar}
				hideSidebar={hideSidebar}
				profileInfo={profileInfo}
				listViewSlot={listViewSlot}
				scheduleTimezone={schedule.timezone}
			/>
			<BookingFlowDialog
				open={isDialogOpen}
				onOpenChange={handleDialogOpenChange}
				eventType={dialogEventType}
				staffName={staff.name}
				staffAvatar={staff.avatar ?? null}
				slotTime={selectedSlotTime}
				slotDate={dateStr}
				formConfig={bookingActions.formConfig}
				onSubmit={bookingActions.handleConfirmWithClient}
				isSubmitting={bookingActions.isSubmitting}
				shareUrl={dialogShareUrl}
				onBookAgain={handleDialogBookAgain}
				onSuccessNavigate={navigateOnSuccess}
			/>
		</CalendarProvider>
	)
}

export { BookingPage }
