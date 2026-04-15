'use client'

import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
	type ViewMode,
	CalendarProvider,
	CalendarCore,
	createOrgStrategy,
} from '@/lib/calendar'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { useViewConfig } from '@/lib/calendar/CalendarViewConfigContext'
import {
	formatDateISO,
	getWorkHoursForDate,
	getFirstStaffId,
	getStaffToLoad,
} from '@/lib/calendar/utils'
import { StaffTabs } from '@/components/booking/StaffTabs'
import { SlotListView } from '@/components/booking/SlotListView'
import {
	useOrgInfo,
	useOrgFiltering,
	useStaffSchedule,
	useStaffBookings,
	useCalendarNavigation,
	useBookingActions,
	useOrgSchedules,
} from '@/lib/calendar/hooks'
import type {
	ScheduleTemplate,
	ScheduleOverride,
	StaffBooking,
	OrgStaffMember,
} from '@/services/configs/booking.types'

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
	publicUrl?: string
}

function OrgCalendarPage({
	orgSlug,
	staffId: staffIdProp,
	publicUrl: publicUrlProp,
}: OrgCalendarPageProps) {
	const searchParams = useSearchParams()
	const viewConfig = useViewConfig()
	const t = useTranslations('booking')
	const locale = useLocale()

	// ── URL state ──

	const dateStr = searchParams.get('date') ?? todayStr()
	const view = (searchParams.get('view') as ViewMode) ?? viewConfig.defaultView
	const selectedStaffId = staffIdProp ?? null
	const selectedEventTypeId = searchParams.get('eventType') ?? null
	const selectedSlotTime = searchParams.get('slot') ?? null

	// ── Navigation (до данных, т.к. фильтрация использует handleStaffSelect) ──

	const navigation = useCalendarNavigation({
		orgSlug,
		dateStr,
		selectedEventTypeId,
	})

	// ── Data ──

	const {
		org,
		staffList,
		loading: orgLoading,
		error: orgError,
	} = useOrgInfo(orgSlug)
	const orgSchedules = useOrgSchedules(orgSlug)

	const activeStaffId = staffIdProp ?? getFirstStaffId(staffList)

	// Автовыбор сотрудника при фильтрации — сохраняет eventType в URL
	const handleStaffAutoSelect = useCallback(
		(staffId: string) => {
			navigation.handleStaffAutoSelect(staffId)
		},
		[navigation],
	)

	// ID сотрудников, работающих в выбранный день — для фильтрации услуг
	const toStaffId = (s: OrgStaffMember): string => s.id
	const getWorkingStaff = orgSchedules.getWorkingStaff
	const currentDateStr = dateStr
	const workingStaffIds = useMemo(
		() => getWorkingStaff(currentDateStr, staffList).map(toStaffId),
		// eslint-disable-next-line react-hooks/preserve-manual-memoization
		[getWorkingStaff, currentDateStr, staffList],
	)

	const filtering = useOrgFiltering({
		orgId: orgSlug,
		allStaff: staffList,
		selectedStaffId,
		selectedEventTypeId,
		workingStaffIds,
		onStaffAutoSelect: viewConfig.filterByStaffCapability
			? handleStaffAutoSelect
			: () => {},
	})

	const {
		eventTypes: scheduleEventTypes,
		schedule,
		loading: scheduleLoading,
		error: scheduleError,
	} = useStaffSchedule(activeStaffId, orgSlug)

	// На публичных страницах используем отфильтрованные услуги
	const eventTypes = viewConfig.filterByStaffCapability
		? filtering.filteredEventTypes
		: scheduleEventTypes

	const staffToLoad = useMemo(
		() =>
			getStaffToLoad(staffList, selectedStaffId, viewConfig.staffTabBehavior),
		[staffList, selectedStaffId, viewConfig.staffTabBehavior],
	)

	const {
		bookings,
		staffBookingsMap,
		reloadBookings,
		loading: bookingsLoading,
		error: bookingsError,
	} = useStaffBookings(staffToLoad, dateStr, view, eventTypes, org?.id, schedule?.timezone)

	// Начальная загрузка — блокирует рендер полностью
	const initialLoading =
		orgLoading || orgSchedules.loading || (scheduleLoading && !schedule)
	// Фоновая загрузка — календарь остаётся, данные обновляются
	const contentLoading = scheduleLoading || bookingsLoading || filtering.loading
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
		if (bookingActions.confirmedBooking) reloadBookings()
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

	// ── Guards ──

	if (initialLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">{t('loading')}</p>
			</div>
		)
	}

	if (error || !org) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-destructive text-sm">{error ?? t('loadError')}</p>
			</div>
		)
	}

	// ── Derived data ──

	// Рабочие часы: если выбран сотрудник — его, иначе объединённые
	const staffSchedule = selectedStaffId
		? orgSchedules.getStaffSchedule(selectedStaffId)
		: null
	const scheduleSource = staffSchedule ?? schedule ?? DEFAULT_SCHEDULE

	const workHoursData = selectedStaffId
		? getWorkHoursForDate(
				scheduleSource.weeklyHours,
				dateStr,
				orgSchedules.overrides,
				selectedStaffId,
			)
		: orgSchedules.getOrgWorkHours(dateStr)

	// Выходной организации: никто не работает (только для day view, без выбранного сотрудника)
	const isOrgDayOff = view === 'day' && !selectedStaffId && !workHoursData
	// Выбранный сотрудник не работает в этот день
	const isStaffDayOff = view === 'day' && !!selectedStaffId && !workHoursData

	const workStart = workHoursData?.workStart ?? '10:00'
	const workEnd = workHoursData?.workEnd ?? '18:00'

	// Выходные дни: если выбран сотрудник — его, иначе дни когда никто не работает
	const disabledDays = orgSchedules.getDisabledDays(selectedStaffId)

	// ── Strategy ──

	const strategy = createOrgStrategy({
		orgName: org.name,
		locale,
		selectedStaffId,
		selectStaffLabel: t('selectStaffToView'),
		selectStaffToBookLabel: t('selectStaffToBook'),
		bookingDetailsLabel: t('bookingDetails'),
		dayOffLabel: isStaffDayOff ? t('staffDayOff') : t('dayOff'),
		isDayOff: isOrgDayOff,
		isStaffDayOff,
		bookings,
		canBookForClient: viewConfig.canBookForClient,
		eventTypes: isOrgDayOff ? [] : eventTypes,
		schedule: staffSchedule ?? schedule ?? undefined,
		selectedEventTypeId,
		selectedSlot: selectedSlotTime,
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
		isSubmitting: bookingActions.isSubmitting,
		formConfig: bookingActions.formConfig,
		bookingError: bookingActions.bookingError,
		selectedBooking: bookingActions.selectedBooking,
		onBookingSelect: bookingActions.handleBookingSelect,
		onBookingStatusChange: bookingActions.handleBookingStatusChange,
		onBookingReschedule: bookingActions.handleBookingReschedule,
		onBookingClose: bookingActions.handleBookingClose,
		loading: contentLoading,
		staffList,
		overrides: orgSchedules.overrides,
	})

	// Фильтрация: рабочий день + фильтрация по услугам
	const workingStaff = orgSchedules.getWorkingStaff(dateStr, staffList)
	const isWorkingStaff = (staff: OrgStaffMember): boolean =>
		workingStaff.some((ws) => ws.id === staff.id)

	const displayStaff = viewConfig.filterByStaffCapability
		? filtering.filteredStaff.filter(isWorkingStaff)
		: workingStaff

	// ── List view helpers ──

	const getStaffScheduleById = (staffId: string): ScheduleTemplate | null =>
		orgSchedules.getStaffSchedule(staffId)

	const isStaffOverride =
		(staffId: string) =>
		(o: ScheduleOverride): boolean =>
			o.staffId === staffId

	const getStaffOverridesById = (staffId: string): ScheduleOverride[] =>
		orgSchedules.overrides.filter(isStaffOverride(staffId))

	const getStaffBookingsById = (staffId: string): StaffBooking[] =>
		staffBookingsMap[staffId] ?? []

	const listViewSlot = (
		<SlotListView
			variant="org"
			eventTypes={eventTypes}
			selectedEventTypeId={selectedEventTypeId}
			onEventTypeSelect={onEventTypeSelect}
			loading={contentLoading}
			staff={displayStaff}
			filterStaffId={selectedStaffId}
			getStaffSchedule={getStaffScheduleById}
			getStaffOverrides={getStaffOverridesById}
			getStaffBookings={getStaffBookingsById}
			dateStr={dateStr}
			onDateChange={onDateChange}
			formConfig={bookingActions.formConfig}
			onConfirmWithClient={bookingActions.handleConfirmWithClient}
			isSubmitting={bookingActions.isSubmitting}
		/>
	)

	const staffTabsSlot =
		viewConfig.showStaffTabs ? (
			<StaffTabs
				staff={displayStaff}
				selectedId={selectedStaffId}
				behavior={viewConfig.staffTabBehavior}
				allowAll
				onSelect={onStaffSelect}
				loading={contentLoading}
			/>
		) : null

	// ── Profile info ──

	const profileInfo = {
		name: org.name,
		logo: org.logo,
		avatar: null,
		description: org.description,
		address: org.address,
		phone: org.phone,
		website: org.website,
		isOrg: true,
		showThemeToggle: !publicUrlProp,
	}

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
				isDayOff={isOrgDayOff || isStaffDayOff}
				staffTabsSlot={staffTabsSlot}
				listViewSlot={listViewSlot}
				publicUrl={publicUrlProp}
				profileInfo={profileInfo}
			/>
		</CalendarProvider>
	)
}

export { OrgCalendarPage }
