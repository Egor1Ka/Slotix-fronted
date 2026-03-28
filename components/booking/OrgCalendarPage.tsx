'use client'

import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { type SlotMode } from '@/lib/slot-engine'
import {
	type ViewMode,
	CalendarProvider,
	CalendarCore,
	createOrgStrategy,
} from '@/lib/calendar'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { useViewConfig } from '@/lib/calendar/CalendarViewConfigContext'
import { formatDateISO, getWorkHoursForDate, getFirstStaffId, getStaffToLoad } from '@/lib/calendar/utils'
import { StaffTabs } from '@/components/booking/StaffTabs'
import {
	useOrgInfo,
	useOrgFiltering,
	useStaffSchedule,
	useStaffBookings,
	useCalendarNavigation,
	useBookingActions,
} from '@/lib/calendar/hooks'
import type { ScheduleTemplate } from '@/services/configs/booking.types'

// ── Module-level constants ──

const todayStr = (): string => formatDateISO(new Date())

const createDefaultDayHours = (_: unknown, i: number) => ({
	dayOfWeek: i,
	enabled: i >= 1 && i <= 5,
	slots: i >= 1 && i <= 5 ? [{ start: '10:00', end: '18:00' }] : [],
})

const DEFAULT_WEEKLY_HOURS = Array.from({ length: 7 }, createDefaultDayHours)

const DEFAULT_SCHEDULE: ScheduleTemplate = {
	staffId: '',
	orgId: null,
	weeklyHours: DEFAULT_WEEKLY_HOURS,
	slotStepMin: 30,
	slotMode: 'fixed',
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

const isDisabledDay = (wh: { dayOfWeek: number; enabled: boolean }): boolean =>
	!wh.enabled
const toDayOfWeek = (wh: { dayOfWeek: number }): number => wh.dayOfWeek

// ── Component ──

interface OrgCalendarPageProps {
	orgSlug: string
	staffId?: string
}

function OrgCalendarPage({ orgSlug, staffId: staffIdProp }: OrgCalendarPageProps) {
	const searchParams = useSearchParams()
	const viewConfig = useViewConfig()
	const t = useTranslations('booking')
	const locale = useLocale()

	// ── URL state ──

	const dateStr = searchParams.get('date') ?? todayStr()
	const view = (searchParams.get('view') as ViewMode) ?? 'day'
	const selectedStaffId = staffIdProp ?? null
	const selectedEventTypeId = searchParams.get('eventType') ?? null
	const selectedSlotTime = searchParams.get('slot') ?? null
	const slotMode = (searchParams.get('mode') as SlotMode) ?? 'fixed'

	// ── Navigation (до данных, т.к. фильтрация использует handleStaffSelect) ──

	const navigation = useCalendarNavigation({ orgSlug, dateStr, selectedEventTypeId })

	// ── Data ──

	const { org, staffList, loading: orgLoading, error: orgError } = useOrgInfo(orgSlug)

	const activeStaffId = staffIdProp ?? getFirstStaffId(staffList)

	// Автовыбор сотрудника при фильтрации — сохраняет eventType в URL
	const handleStaffAutoSelect = useCallback((staffId: string) => {
		navigation.handleStaffAutoSelect(staffId)
	}, [navigation])

	const filtering = useOrgFiltering({
		orgId: orgSlug,
		allStaff: staffList,
		selectedStaffId,
		selectedEventTypeId,
		onStaffAutoSelect: handleStaffAutoSelect,
	})

	const { eventTypes: scheduleEventTypes, schedule, loading: scheduleLoading, error: scheduleError } =
		useStaffSchedule(activeStaffId)

	// На публичных страницах используем отфильтрованные услуги
	const eventTypes = viewConfig.filterByStaffCapability ? filtering.filteredEventTypes : scheduleEventTypes

	const staffToLoad = useMemo(
		() => getStaffToLoad(staffList, selectedStaffId, viewConfig.staffTabBehavior),
		[staffList, selectedStaffId, viewConfig.staffTabBehavior],
	)

	const { bookings, reloadBookings, loading: bookingsLoading, error: bookingsError } =
		useStaffBookings(staffToLoad, dateStr, view, eventTypes)

	const loading = orgLoading || scheduleLoading || bookingsLoading || filtering.loading
	const error = orgError || scheduleError || bookingsError

	// ── Booking actions ──

	const bookingActions = useBookingActions(
		{
			staffId: selectedStaffId,
			staffList,
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

	const onStaffSelect = (id: string | null) => {
		navigation.handleStaffSelect(id)
		resetBookingState()
	}

	const onEventTypeSelect = (eventTypeId: string) => {
		navigation.handleEventTypeSelect(eventTypeId)
		resetBookingState()
	}

	const onModeChange = (mode: SlotMode) => {
		navigation.handleModeChange(mode)
		resetBookingState()
	}

	// ── Guards ──

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">{t('loading')}</p>
			</div>
		)
	}

	if (error || !org) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-destructive text-sm">
					{error ?? t('loadError')}
				</p>
			</div>
		)
	}

	// ── Derived data ──

	const scheduleSource = schedule ?? DEFAULT_SCHEDULE
	const workHours = getWorkHoursForDate(scheduleSource.weeklyHours, dateStr)
	const workStart = workHours?.workStart ?? '10:00'
	const workEnd = workHours?.workEnd ?? '18:00'
	const disabledDays = scheduleSource.weeklyHours.filter(isDisabledDay).map(toDayOfWeek)

	// ── Strategy ──

	const strategy = createOrgStrategy({
		orgName: org.name,
		locale,
		selectStaffLabel: t('selectStaffToView'),
		bookingDetailsLabel: t('bookingDetails'),
		bookings,
		canBookForClient: viewConfig.canBookForClient,
		eventTypes,
		schedule: schedule ?? undefined,
		selectedEventTypeId,
		selectedSlot: selectedSlotTime,
		slotMode,
		confirmedBooking: bookingActions.confirmedBooking,
		date: dateStr,
		onSelectEventType: onEventTypeSelect,
		onSelectSlot: (time: string, slotDate?: string) => {
			navigation.handleSlotSelect(time, slotDate)
			bookingActions.handleBookingClose()
		},
		onConfirmWithClient: bookingActions.handleConfirmWithClient,
		onCancel: bookingActions.handleCancel,
		onResetSlot: bookingActions.handleResetSlot,
		onModeChange,
		isSubmitting: bookingActions.isSubmitting,
		bookingError: bookingActions.bookingError,
		selectedBooking: bookingActions.selectedBooking,
		onBookingSelect: bookingActions.handleBookingSelect,
		onBookingStatusChange: bookingActions.handleBookingStatusChange,
		onBookingReschedule: bookingActions.handleBookingReschedule,
		onBookingClose: bookingActions.handleBookingClose,
	})

	// На публичных страницах показываем только подходящих сотрудников
	const displayStaff = viewConfig.filterByStaffCapability ? filtering.filteredStaff : staffList

	const staffTabsSlot = viewConfig.showStaffTabs ? (
		<StaffTabs
			staff={displayStaff}
			selectedId={selectedStaffId}
			behavior={viewConfig.staffTabBehavior}
			onSelect={onStaffSelect}
		/>
	) : null

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
				staffTabsSlot={staffTabsSlot}
				publicUrl={`/${locale}/org/${orgSlug}`}
			/>
		</CalendarProvider>
	)
}

export { OrgCalendarPage }
