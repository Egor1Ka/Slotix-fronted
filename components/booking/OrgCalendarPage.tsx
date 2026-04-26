'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { saveBookingSuccess } from '@/lib/booking/booking-success-storage'
import type { ConfirmedBooking } from '@/lib/calendar/types'
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
	getWorkHoursForDate,
	getFirstStaffId,
	getStaffToLoad,
} from '@/lib/calendar/utils'
import { StaffTabs } from '@/components/booking/StaffTabs'
import { SlotListView } from '@/components/booking/SlotListView'
import { BookingFlowDialog } from '@/components/booking/BookingFlowDialog'
import { BookingErrorState } from '@/components/booking/BookingErrorState'
import { buildShareUrl } from '@/lib/booking/build-share-url'
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
import { bookingStatusApi } from '@/lib/booking-api-client'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

// ── Module-level constants ──

const todayStr = (): string =>
	new Intl.DateTimeFormat('en-CA').format(new Date())

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
	const router = useRouter()
	const viewConfig = useViewConfig()
	const t = useTranslations('booking')
	const locale = useLocale()

	// ── URL state ──

	const dateStr = searchParams.get('date') ?? todayStr()
	const view = (searchParams.get('view') as ViewMode) ?? viewConfig.defaultView
	const selectedStaffId = staffIdProp ?? null
	const selectedEventTypeId = searchParams.get('eventType') ?? null
	const selectedSlotTime = searchParams.get('slot') ?? null

	const [bookingDialogOpen, setBookingDialogOpen] = useState(false)

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

	const [availableStatuses, setAvailableStatuses] = useState<BookingStatusObject[]>([])

	useEffect(() => {
		if (!org) return
		const loadStatuses = async () => {
			try {
				const statuses = await bookingStatusApi.getAll(org.id)
				setAvailableStatuses(statuses)
			} catch {
				// обрабатывается интерцептором toast
			}
		}
		loadStatuses()
	}, [org])

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
		return <BookingErrorState status={error} />
	}

	// ── Derived data ──

	// Рабочие часы: если выбран сотрудник — его, иначе объединённые
	const staffSchedule = selectedStaffId
		? orgSchedules.getStaffSchedule(selectedStaffId)
		: null
	const scheduleSource = staffSchedule ?? schedule

	if (!scheduleSource) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">{t('loading')}</p>
			</div>
		)
	}

	const workHoursData = selectedStaffId
		? getWorkHoursForDate(
				scheduleSource.weeklyHours,
				dateStr,
				scheduleSource.timezone,
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
		date: dateStr,
		onSelectEventType: onEventTypeSelect,
		onSelectSlot: (time: string, slotDate?: string) => {
			navigation.handleSlotSelect(time, slotDate)
			bookingActions.handleBookingClose()
			setBookingDialogOpen(true)
		},
		selectedBooking: bookingActions.selectedBooking,
		onBookingSelect: bookingActions.handleBookingSelect,
		onBookingStatusChange: bookingActions.handleBookingStatusChange,
		onBookingReschedule: bookingActions.handleBookingReschedule,
		onBookingClose: bookingActions.handleBookingClose,
		loading: contentLoading,
		staffList,
		overrides: orgSchedules.overrides,
		availableStatuses,
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

	const dialogShareUrlForList =
		typeof window !== 'undefined'
			? buildShareUrl({
					origin: window.location.origin,
					variant: selectedStaffId ? 'staff' : 'org',
					orgSlug: org.id,
					staffId: selectedStaffId ?? undefined,
				})
			: ''

	const handleListBookAgain = () => {
		navigation.setParams({ eventType: null, slot: null })
	}

	const dialogStaff =
		staffList.find((s) => s.id === selectedStaffId) ?? null

	// ── Success navigation (only public users) ──

	const returnUrl = viewConfig.isPublicBookingPage
		? selectedStaffId
			? `/${locale}/org/${orgSlug}/${selectedStaffId}`
			: `/${locale}/org/${orgSlug}`
		: ''

	const handleSuccessNavigate = (result: ConfirmedBooking) => {
		saveBookingSuccess({
			result,
			staffName: dialogStaff?.name ?? null,
			staffAvatar: dialogStaff?.avatar ?? null,
			returnUrl,
		})
		router.push(`/${locale}/booking/success`)
	}

	const navigateOnSuccess = viewConfig.isPublicBookingPage
		? handleSuccessNavigate
		: undefined

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
			shareUrl={dialogShareUrlForList}
			onBookAgain={handleListBookAgain}
			onSuccessNavigate={navigateOnSuccess}
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

	// ── Booking flow dialog ──

	const dialogShareUrl =
		typeof window !== 'undefined'
			? buildShareUrl({
					origin: window.location.origin,
					variant: selectedStaffId ? 'staff' : 'org',
					orgSlug: org.id,
					staffId: selectedStaffId ?? undefined,
				})
			: ''

	const handleDialogOpenChange = (next: boolean) => {
		setBookingDialogOpen(next)
		if (!next) navigation.setParams({ slot: null })
	}

	const handleDialogBookAgain = () => {
		setBookingDialogOpen(false)
		navigation.setParams({ eventType: null, slot: null })
	}

	const findEventTypeById = (id: string | null) =>
		eventTypes.find((et) => et.id === id) ?? null
	const dialogEventType = findEventTypeById(selectedEventTypeId)

	const isDialogOpen =
		bookingDialogOpen && !!selectedEventTypeId && !!selectedSlotTime

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
				scheduleTimezone={scheduleSource.timezone}
			/>
			<BookingFlowDialog
				open={isDialogOpen}
				onOpenChange={handleDialogOpenChange}
				eventType={dialogEventType}
				staffName={dialogStaff?.name ?? null}
				staffAvatar={dialogStaff?.avatar ?? null}
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

export { OrgCalendarPage }
