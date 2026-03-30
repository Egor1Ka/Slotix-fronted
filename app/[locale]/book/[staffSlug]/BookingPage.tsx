'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { type SlotMode } from '@/lib/slot-engine'
import {
	type ViewMode,
	CalendarProvider,
	CalendarCore,
	createClientStrategy,
	createStaffStrategy,
} from '@/lib/calendar'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { useViewConfig } from '@/lib/calendar/CalendarViewConfigContext'
import {
	formatDateISO,
	getWorkHoursForDate,
	getFirstStaffId,
} from '@/lib/calendar/utils'
import { scheduleApi } from '@/lib/booking-api-client'
import {
	useStaffBySlug,
	useStaffSchedule,
	useStaffBookings,
	useCalendarNavigation,
	useBookingActions,
} from '@/lib/calendar/hooks'
import type {
	OrgStaffMember,
	ScheduleTemplate,
} from '@/services/configs/booking.types'

// ── Module-level constants ──

const todayStr = (): string => formatDateISO(new Date())

const isDisabledDay = (wh: { dayOfWeek: number; enabled: boolean }): boolean =>
	!wh.enabled
const toDayOfWeek = (wh: { dayOfWeek: number }): number => wh.dayOfWeek

const toStaffMember = (staff: {
	id: string
	name: string
}): OrgStaffMember => ({
	id: staff.id,
	name: staff.name,
	avatar: '',
	position: null,
	bookingCount: 0,
})

const DEFAULT_WEEKLY_HOURS = Array.from(
	{ length: 7 },
	(_: unknown, i: number) => ({
		dayOfWeek: i,
		enabled: i >= 1 && i <= 5,
		slots: i >= 1 && i <= 5 ? [{ start: '10:00', end: '18:00' }] : [],
	}),
)

const DEFAULT_SCHEDULE: ScheduleTemplate = {
	staffId: '',
	orgId: null,
	weeklyHours: DEFAULT_WEEKLY_HOURS,
	slotStepMin: 30,
	slotMode: 'fixed',
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

// ── Component ──

interface BookingPageProps {
	staffSlug: string
	publicUrl?: string
}

function BookingPage({ staffSlug, publicUrl }: BookingPageProps) {
	const searchParams = useSearchParams()
	const viewConfig = useViewConfig()
	const canBookForClient = viewConfig.canBookForClient
	const t = useTranslations('booking')
	const tCalendar = useTranslations('calendar')
	const locale = useLocale()

	// ── URL state ──

	const dateStr = searchParams.get('date') ?? todayStr()
	const view = (searchParams.get('view') as ViewMode) ?? 'day'
	const selectedEventTypeId = searchParams.get('eventType')
	const selectedSlotTime = searchParams.get('slot')
	const slotMode = (searchParams.get('mode') as SlotMode) ?? 'fixed'

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
		reloadBookings,
		loading: bookingsLoading,
		error: bookingsError,
	} = useStaffBookings(staffToLoad, dateStr, view, eventTypes)

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
			reloadBookings,
			getFirstStaffId,
			t,
		},
		navigation.setParams,
	)

	// ── Navigation wrappers (reset booking state on navigation) ──

	const resetBookingState = () => {
		bookingActions.setConfirmedBooking(null)
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
	}

	const onModeChange = (mode: SlotMode) => {
		navigation.handleModeChange(mode)
		resetBookingState()
	}

	// ── Schedule editing (staff-specific) ──

	const handleSaveSchedule = async (
		weeklyHours: ScheduleTemplate['weeklyHours'],
	) => {
		if (!staff) return
		try {
			await scheduleApi.updateTemplate(
				staff.id,
				schedule?.orgId ?? null,
				weeklyHours,
			)
			reloadSchedule()
			toast.success(tCalendar('scheduleSaved'))
		} catch (err) {
			const message =
				err instanceof Error ? err.message : tCalendar('scheduleSaveError')
			toast.error(message)
			throw err
		}
	}

	const handleSaveOverride = async (
		body: Parameters<typeof scheduleApi.createOverride>[0],
	) => {
		try {
			await scheduleApi.createOverride(body)
			reloadSchedule()
			toast.success(tCalendar('overrideSaved'))
		} catch (err) {
			const message =
				err instanceof Error ? err.message : tCalendar('overrideSaveError')
			toast.error(message)
			throw err
		}
	}

	// ── Client confirm (no client info) ──

	const handleConfirm = async () => {
		await bookingActions.handleConfirmWithClient({
			name: t('defaultClient'),
			email: '',
			phone: '',
		})
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

	// ── Derived data ──

	const scheduleSource = schedule ?? DEFAULT_SCHEDULE
	const workHours = getWorkHoursForDate(scheduleSource.weeklyHours, dateStr)
	const workStart = workHours?.workStart ?? '10:00'
	const workEnd = workHours?.workEnd ?? '18:00'
	const disabledDays = scheduleSource.weeklyHours
		.filter(isDisabledDay)
		.map(toDayOfWeek)

	// ── Strategy ──

	const strategy = canBookForClient
		? createStaffStrategy({
				staffName: tCalendar('mySchedule'),
				locale,
				eventTypes,
				bookings,
				schedule: scheduleSource,
				selectedEventTypeId,
				selectedSlot: selectedSlotTime,
				slotMode,
				confirmedBooking: bookingActions.confirmedBooking,
				date: dateStr,
				onSelectEventType: onEventTypeSelect,
				onSelectSlot: onSlotSelect,
				onConfirmWithClient: bookingActions.handleConfirmWithClient,
				onCancel: bookingActions.handleCancel,
				onResetSlot: bookingActions.handleResetSlot,
				onModeChange,
				isSubmitting: bookingActions.isSubmitting,
				onSaveSchedule: handleSaveSchedule,
				onSaveOverride: handleSaveOverride,
				onBookingClick: bookingActions.handleBookingSelect,
				selectedBooking: bookingActions.selectedBooking,
				onCloseBooking: bookingActions.handleBookingClose,
				onBookingStatusChange: bookingActions.handleBookingStatusChange,
				onBookingReschedule: bookingActions.handleBookingReschedule,
				showScheduleEditor: viewConfig.showScheduleEditor,
			})
		: createClientStrategy({
				eventTypes,
				bookings,
				schedule: scheduleSource,
				overrides: staffOverrides,
				staffId: staff.id,
				staffName: staff.name,
				locale,
				selectedEventTypeId,
				selectedSlot: selectedSlotTime,
				slotMode,
				confirmedBooking: bookingActions.confirmedBooking,
				date: dateStr,
				onSelectEventType: onEventTypeSelect,
				onSelectSlot: onSlotSelect,
				onConfirm: handleConfirm,
				onCancel: bookingActions.handleCancel,
				onResetSlot: bookingActions.handleResetSlot,
				onModeChange,
			})

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
				disabledDays={disabledDays}
				publicUrl={publicUrl}
			/>
		</CalendarProvider>
	)
}

export { BookingPage }
