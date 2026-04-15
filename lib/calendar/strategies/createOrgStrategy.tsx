import type {
	CalendarStrategy,
	CalendarBlock,
	ConfirmedBooking,
	ViewMode,
} from '../types'
import {
	formatDateLocale,
	formatWeekRange,
	formatMonth,
	getWeekDates,
	getBookingsForDate,
	findEventType,
	getWorkHoursForDate,
	getCalendarLocale,
	getNowMinForDate,
} from '../utils'
import {
	getAvailableSlots,
	timeToMin,
	minToTime,
	type Slot,
} from '@/lib/slot-engine'
import type {
	EventType,
	ScheduleTemplate,
	ScheduleOverride,
	CalendarDisplayBooking,
	OrgStaffMember,
} from '@/services/configs/booking.types'
import { ServiceList } from '@/components/booking/ServiceList'
import { ServiceInfo } from '@/components/booking/BookingPanelParts'
import { StaffInfoCard } from '@/components/booking/StaffInfoCard'
import { StaffBookingPanel } from '@/components/booking/StaffBookingPanel'
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'
import {
	BookingDetailsPanel,
	type BookingDetail,
} from '@/components/booking/BookingDetailsPanel'
import type { BookingStatus } from '@/services/configs/booking.types'

interface OrgStrategyParams {
	orgName: string
	bookings: CalendarDisplayBooking[]
	canBookForClient: boolean
	eventTypes?: EventType[]
	schedule?: ScheduleTemplate
	selectedEventTypeId?: string | null
	selectedSlot?: string | null
	confirmedBooking?: ConfirmedBooking | null
	date?: string
	onSelectEventType?: (eventTypeId: string) => void
	onSelectSlot?: (time: string, date?: string) => void
	onConfirmWithClient?: (data: ClientInfoData) => void
	onCancel?: () => void
	onResetSlot?: () => void
	isSubmitting?: boolean
	formConfig?: MergedBookingForm | null
	bookingError?: string | null
	selectedBooking?: BookingDetail | null
	onBookingSelect?: (bookingId: string) => void
	onBookingStatusChange?: (
		bookingId: string,
		status: BookingStatus,
	) => Promise<void>
	onBookingReschedule?: (bookingId: string, newStartAt: string) => Promise<void>
	onBookingClose?: () => void
	locale: string
	selectedStaffId?: string | null
	selectStaffLabel?: string
	selectStaffToBookLabel?: string
	bookingDetailsLabel?: string
	dayOffLabel?: string
	isDayOff?: boolean
	isStaffDayOff?: boolean
	loading?: boolean
	staffList?: OrgStaffMember[]
	overrides?: ScheduleOverride[]
}

const normalizeDate = (d: string): string =>
	d.includes('T') ? d.split('T')[0] : d

const getBreakBookings = (
	overridesList: ScheduleOverride[],
	staffId: string,
	blockDate: string,
): { startMin: number; duration: number }[] => {
	const dateOnly = normalizeDate(blockDate)
	const matchesStaffAndDate = (o: ScheduleOverride): boolean =>
		o.staffId === staffId && normalizeDate(o.date) === dateOnly
	const override = overridesList.find(matchesStaffAndDate)
	if (!override) return []
	const isPartialDayOff = !override.enabled && override.slots.length > 0
	if (!isPartialDayOff) return []
	const toBreakBooking = (slot: { start: string; end: string }) => ({
		startMin: timeToMin(slot.start),
		duration: timeToMin(slot.end) - timeToMin(slot.start),
	})
	return override.slots.map(toBreakBooking)
}

const createOrgStrategy = (params: OrgStrategyParams): CalendarStrategy => {
	const {
		orgName,
		bookings,
		canBookForClient,
		eventTypes = [],
		schedule,
		selectedEventTypeId = null,
		selectedSlot = null,
		confirmedBooking = null,
		date = '',
		onSelectEventType,
		onSelectSlot,
		onConfirmWithClient,
		onCancel,
		onResetSlot,
		isSubmitting = false,
		formConfig = null,
		bookingError = null,
		selectedBooking = null,
		onBookingSelect,
		onBookingStatusChange,
		onBookingReschedule,
		onBookingClose,
		locale,
		selectedStaffId = null,
		selectStaffLabel = 'Select a staff member to view the schedule',
		selectStaffToBookLabel = 'Select a staff member to book',
		bookingDetailsLabel = 'Booking details',
		dayOffLabel = 'Day off',
		isDayOff = false,
		isStaffDayOff = false,
		loading = false,
		staffList = [],
		overrides = [],
	} = params

	const calendarLocale = getCalendarLocale(locale)
	const selectedEventType = findEventType(eventTypes, selectedEventTypeId)

	const allBookings = bookings

	const buildBookingBlocks = (blockDate: string): CalendarBlock[] => {
		const dayBookings = getBookingsForDate(allBookings, blockDate)

		const toBookingBlock = (
			booking: CalendarDisplayBooking,
			index: number,
		): CalendarBlock => ({
			id: `org-booking-${blockDate}-${index}`,
			startMin: booking.startMin,
			duration: booking.duration,
			date: blockDate,
			color: booking.color,
			label: booking.label,
			sublabel: `${minToTime(booking.startMin)}–${minToTime(booking.startMin + booking.duration)}`,
			blockType: 'booking',
			avatarUrl: booking.staffAvatar || undefined,
			onClick: onBookingSelect
				? () => onBookingSelect(booking.bookingId)
				: undefined,
		})

		return dayBookings.map(toBookingBlock)
	}

	const buildSlotBlocks = (blockDate: string): CalendarBlock[] => {
		if (
			!canBookForClient ||
			!selectedEventType ||
			!selectedStaffId ||
			!schedule ||
			confirmedBooking
		)
			return []

		const workHours = getWorkHoursForDate(
			schedule.weeklyHours,
			blockDate,
			schedule.timezone,
			overrides,
			selectedStaffId ?? undefined,
		)
		if (!workHours) return []

		const dayBookingsForSlots = getBookingsForDate(bookings, blockDate)
		const toSlotEngine = (b: CalendarDisplayBooking) => ({
			startMin: b.startMin,
			duration: b.duration,
		})

		const breakBookings = getBreakBookings(
			overrides,
			selectedStaffId,
			blockDate,
		)
		const allBookingsForSlots = [
			...dayBookingsForSlots.map(toSlotEngine),
			...breakBookings,
		]

		const slots = getAvailableSlots({
			workStart: workHours.workStart,
			workEnd: workHours.workEnd,
			duration: selectedEventType.durationMin,
			slotStep: schedule.slotStepMin,
			slotMode: schedule?.slotMode ?? 'fixed',
			bookings: allBookingsForSlots,
			minNotice: 0,
			nowMin: getNowMinForDate(blockDate),
		})

		const toDropZoneBlock = (slot: Slot): CalendarBlock | null => {
			if (selectedSlot === slot.startTime && blockDate === date) return null

			return {
				id: `slot-${blockDate}-${slot.startMin}`,
				startMin: slot.startMin,
				duration: selectedEventType.durationMin,
				date: blockDate,
				color: slot.isExtra ? '#FB923C' : selectedEventType.color,
				borderStyle: 'dashed' as const,
				label: slot.startTime,
				blockType: 'dropzone',
				onClick: () => onSelectSlot?.(slot.startTime, blockDate),
			}
		}

		const isNotNull = <T,>(v: T | null): v is T => v !== null
		return slots.map(toDropZoneBlock).filter(isNotNull)
	}

	const buildPendingBlock = (blockDate: string): CalendarBlock[] => {
		if (
			!canBookForClient ||
			!selectedEventType ||
			!selectedSlot ||
			blockDate !== date ||
			confirmedBooking
		)
			return []
		const slotMin = timeToMin(selectedSlot)
		return [
			{
				id: `pending-${blockDate}`,
				startMin: slotMin,
				duration: selectedEventType.durationMin,
				date: blockDate,
				color: selectedEventType.color,
				opacity: 0.6,
				label: selectedEventType.name,
				sublabel: `${selectedSlot}–${minToTime(slotMin + selectedEventType.durationMin)}`,
				blockType: 'pending' as const,
			},
		]
	}

	const buildBreakBlocks = (blockDate: string): CalendarBlock[] => {
		if (!selectedStaffId) return []
		const breaks = getBreakBookings(overrides, selectedStaffId, blockDate)
		const toLockedBlock = (
			brk: { startMin: number; duration: number },
			index: number,
		): CalendarBlock => ({
			id: `break-${blockDate}-${index}`,
			startMin: brk.startMin,
			duration: brk.duration,
			date: blockDate,
			color: '',
			blockType: 'locked',
		})
		return breaks.map(toLockedBlock)
	}

	return {
		getBlocks(blockDate: string): CalendarBlock[] {
			const bookingBlocks = buildBookingBlocks(blockDate)
			const breakBlocks = buildBreakBlocks(blockDate)
			const dropZoneBlocks = buildSlotBlocks(blockDate)
			const pendingBlocks = buildPendingBlock(blockDate)
			return [
				...bookingBlocks,
				...breakBlocks,
				...dropZoneBlocks,
				...pendingBlocks,
			]
		},

		renderSidebar() {
			if (isDayOff) {
				return (
					<div className="text-muted-foreground p-4 text-sm">{dayOffLabel}</div>
				)
			}

			if (eventTypes.length === 0 && !loading) {
				return (
					<div className="text-muted-foreground p-4 text-sm">
						{selectStaffLabel}
					</div>
				)
			}

			return (
				<ServiceList
					eventTypes={eventTypes}
					selectedId={selectedEventTypeId}
					onSelect={onSelectEventType ?? (() => {})}
					loading={loading}
				/>
			)
		},

		renderMobileSidebar() {
			if (isDayOff || eventTypes.length === 0) return null

			return (
				<ServiceList
					eventTypes={eventTypes}
					selectedId={selectedEventTypeId}
					onSelect={onSelectEventType ?? (() => {})}
					loading={loading}
					variant="horizontal"
				/>
			)
		},

		renderPanel() {
			if (isDayOff || isStaffDayOff) {
				return (
					<div className="text-muted-foreground p-4 text-sm">{dayOffLabel}</div>
				)
			}

			if (selectedBooking) {
				const bookingEventType = findEventType(
					eventTypes,
					selectedBooking.eventTypeId,
				)
				const staffUserId = selectedBooking.hosts[0]?.userId ?? null
				const findStaffByUserId = (s: OrgStaffMember): boolean =>
					s.id === staffUserId
				const bookingStaff = staffList.find(findStaffByUserId)

				return (
					<>
						{bookingError && (
							<div className="text-destructive bg-destructive/10 mb-3 rounded-md p-3 text-sm">
								{bookingError}
							</div>
						)}
						<BookingDetailsPanel
							booking={selectedBooking}
							eventTypeName={bookingEventType?.name ?? ''}
							eventTypeColor={bookingEventType?.color ?? '#888'}
							staffName={bookingStaff?.name}
							staffAvatar={bookingStaff?.avatar}
							staffPosition={bookingStaff?.position ?? undefined}
							onChangeStatus={onBookingStatusChange ?? (async () => {})}
							onReschedule={onBookingReschedule ?? (async () => {})}
							onClose={onBookingClose ?? (() => {})}
						/>
					</>
				)
			}

			if (!canBookForClient) {
				return (
					<div className="text-muted-foreground p-4 text-sm">
						{bookingDetailsLabel}
					</div>
				)
			}

			// Услуга выбрана, но сотрудник — нет
			if (selectedEventType && !selectedStaffId) {
				return (
					<>
						<ServiceInfo eventType={selectedEventType} />
						<div className="text-muted-foreground mt-3 text-sm">
							{selectStaffToBookLabel}
						</div>
					</>
				)
			}

			const findSelectedStaff = (s: OrgStaffMember): boolean =>
				s.id === selectedStaffId
			const selectedStaff = staffList?.find(findSelectedStaff) ?? null

			return (
				<>
					{selectedStaff && (
						<StaffInfoCard
							name={selectedStaff.name}
							avatar={selectedStaff.avatar}
							position={selectedStaff.position}
							bio={selectedStaff.bio}
						/>
					)}
					{bookingError && (
						<div className="text-destructive bg-destructive/10 mb-3 rounded-md p-3 text-sm">
							{bookingError}
						</div>
					)}
					<StaffBookingPanel
						selectedEventType={selectedEventType}
						selectedSlot={selectedSlot}
						confirmedBooking={confirmedBooking}
						formConfig={formConfig}
						onConfirmWithClient={onConfirmWithClient ?? (() => {})}
						onCancel={onCancel ?? (() => {})}
						onResetSlot={onResetSlot ?? (() => {})}
						isSubmitting={isSubmitting}
					/>
				</>
			)
		},

		onCellClick(clickDate: string, startMin: number) {
			if (
				!canBookForClient ||
				!selectedEventType ||
				!selectedStaffId ||
				!schedule
			)
				return

			const workHours = getWorkHoursForDate(
				schedule.weeklyHours,
				clickDate,
				schedule.timezone,
				overrides,
				selectedStaffId ?? undefined,
			)
			if (!workHours) return

			const dayBookingsForSlots = getBookingsForDate(bookings, clickDate)
			const toSlotEngine = (b: CalendarDisplayBooking) => ({
				startMin: b.startMin,
				duration: b.duration,
			})

			const breakBookings = getBreakBookings(
				overrides,
				selectedStaffId,
				clickDate,
			)
			const allBookingsForSlots = [
				...dayBookingsForSlots.map(toSlotEngine),
				...breakBookings,
			]

			const slots = getAvailableSlots({
				workStart: workHours.workStart,
				workEnd: workHours.workEnd,
				duration: selectedEventType.durationMin,
				slotStep: schedule.slotStepMin,
				slotMode: schedule?.slotMode ?? 'fixed',
				bookings: allBookingsForSlots,
				minNotice: 0,
				nowMin: getNowMinForDate(clickDate),
			})

			const isAfterClick = (slot: { startMin: number }): boolean =>
				slot.startMin >= startMin
			const nearest = slots.find(isAfterClick)
			if (nearest) onSelectSlot?.(nearest.startTime, clickDate)
		},

		allowRangeSelect: false,

		getTitle(titleDate: string, view: ViewMode): string {
			const titleTimezone =
				schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
			if (view === 'week')
				return `${orgName} — ${formatWeekRange(getWeekDates(titleDate, titleTimezone), calendarLocale)}`
			if (view === 'month')
				return `${orgName} — ${formatMonth(titleDate, calendarLocale)}`
			return `${orgName} — ${formatDateLocale(titleDate, calendarLocale, titleTimezone)}`
		},
	}
}

export { createOrgStrategy }
export type { OrgStrategyParams }
