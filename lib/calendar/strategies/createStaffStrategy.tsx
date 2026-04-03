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
} from '../utils'
import {
	getAvailableSlots,
	timeToMin,
	minToTime,
	type SlotMode,
	type Slot,
} from '@/lib/slot-engine'
import type {
	EventType,
	ScheduleTemplate,
	ScheduleOverride,
	WeeklyHours,
	CreateScheduleOverrideBody,
	CalendarDisplayBooking,
} from '@/services/configs/booking.types'
import { ServiceList } from '@/components/booking/ServiceList'
import { SlotModeSelector } from '@/components/booking/SlotModeSelector'
import { StaffBookingPanel } from '@/components/booking/StaffBookingPanel'
import { ScheduleSheetButton } from '@/components/booking/ScheduleSheetButton'
import { Separator } from '@/components/ui/separator'
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'
import {
	BookingDetailsPanel,
	type BookingDetail,
} from '@/components/booking/BookingDetailsPanel'
import type { BookingStatus } from '@/services/configs/booking.types'

const normalizeDate = (d: string): string =>
	d.includes('T') ? d.split('T')[0] : d

const getBreakBookings = (
	overridesList: ScheduleOverride[],
	sid: string,
	blockDate: string,
): { startMin: number; duration: number }[] => {
	const dateOnly = normalizeDate(blockDate)
	const matchesStaffAndDate = (o: ScheduleOverride): boolean =>
		o.staffId === sid && normalizeDate(o.date) === dateOnly
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

interface StaffStrategyParams {
	staffName: string
	eventTypes: EventType[]
	bookings: CalendarDisplayBooking[]
	schedule: ScheduleTemplate
	overrides?: ScheduleOverride[]
	staffId?: string
	selectedEventTypeId: string | null
	selectedSlot: string | null
	slotMode: SlotMode
	confirmedBooking: ConfirmedBooking | null
	date: string
	onSelectEventType: (eventTypeId: string) => void
	onSelectSlot: (time: string, date?: string) => void
	onConfirmWithClient: (data: ClientInfoData) => void
	onCancel: () => void
	onResetSlot: () => void
	onModeChange: (mode: SlotMode) => void
	isSubmitting: boolean
	formConfig?: MergedBookingForm | null
	onSaveSchedule: (weeklyHours: WeeklyHours[]) => Promise<void>
	onSaveOverride: (body: CreateScheduleOverrideBody) => Promise<void>
	onSaveSlotMode: (mode: SlotMode) => Promise<void>
	onBookingClick?: (bookingId: string) => void
	selectedBooking?: BookingDetail | null
	onCloseBooking?: () => void
	onBookingStatusChange?: (
		bookingId: string,
		newStatus: BookingStatus,
	) => Promise<void>
	onBookingReschedule?: (bookingId: string, newStartAt: string) => Promise<void>
	locale: string
	showScheduleEditor?: boolean
}

const createStaffStrategy = (params: StaffStrategyParams): CalendarStrategy => {
	const {
		staffName,
		eventTypes,
		bookings,
		schedule,
		overrides: overridesList = [],
		staffId: strategyStaffId,
		selectedEventTypeId,
		selectedSlot,
		slotMode,
		confirmedBooking,
		date,
		onSelectEventType,
		onSelectSlot,
		onConfirmWithClient,
		onCancel,
		onResetSlot,
		onModeChange,
		isSubmitting,
		formConfig = null,
		onSaveSchedule,
		onSaveOverride,
		onSaveSlotMode,
		onBookingClick,
		selectedBooking = null,
		onCloseBooking,
		onBookingStatusChange,
		onBookingReschedule,
		locale,
		showScheduleEditor = false,
	} = params

	const calendarLocale = getCalendarLocale(locale)
	const selectedEventType = findEventType(eventTypes, selectedEventTypeId)

	const allBookings = (() => {
		if (!confirmedBooking || !selectedEventType) return bookings
		const startDate = new Date(confirmedBooking.startAt)
		const confirmedStartMin =
			startDate.getUTCHours() * 60 + startDate.getUTCMinutes()
		const confirmedDate = confirmedBooking.startAt.split('T')[0]
		return [
			...bookings,
			{
				startMin: confirmedStartMin,
				duration: confirmedBooking.durationMin,
				label: confirmedBooking.eventTypeName,
				color: confirmedBooking.color,
				date: confirmedDate,
				bookingId: confirmedBooking.bookingId,
				status: confirmedBooking.status,
				staffName: '',
				staffAvatar: '',
			},
		]
	})()

	return {
		getBlocks(blockDate: string): CalendarBlock[] {
			const dayBookings = getBookingsForDate(allBookings, blockDate)

			const toBookingBlock = (
				booking: CalendarDisplayBooking,
				index: number,
			): CalendarBlock => ({
				id: `staff-booking-${blockDate}-${index}`,
				startMin: booking.startMin,
				duration: booking.duration,
				date: blockDate,
				color: booking.color,
				label: booking.label,
				sublabel: `${minToTime(booking.startMin)}–${minToTime(booking.startMin + booking.duration)}`,
				blockType: 'booking',
				bookingId: booking.bookingId,
				onClick: onBookingClick
					? () => onBookingClick(booking.bookingId)
					: undefined,
			})

			const bookingBlocks = dayBookings.map(toBookingBlock)

			const breakBookings = strategyStaffId
				? getBreakBookings(overridesList, strategyStaffId, blockDate)
				: []

			const breakBlocks: CalendarBlock[] = breakBookings.map((brk, index) => ({
				id: `break-${blockDate}-${index}`,
				startMin: brk.startMin,
				duration: brk.duration,
				date: blockDate,
				color: '',
				blockType: 'locked' as const,
			}))

			if (!selectedEventType || confirmedBooking)
				return [...bookingBlocks, ...breakBlocks]

			const workHours = getWorkHoursForDate(
				schedule.weeklyHours,
				blockDate,
				strategyStaffId ? overridesList : undefined,
				strategyStaffId,
			)
			if (!workHours) return [...bookingBlocks, ...breakBlocks]

			const dayBookingsForSlots = getBookingsForDate(bookings, blockDate)
			const toSlotEngine = (b: CalendarDisplayBooking) => ({
				startMin: b.startMin,
				duration: b.duration,
			})
			const allBookingsForSlots = [
				...dayBookingsForSlots.map(toSlotEngine),
				...breakBookings,
			]

			const slots = getAvailableSlots({
				workStart: workHours.workStart,
				workEnd: workHours.workEnd,
				duration: selectedEventType.durationMin,
				slotStep: schedule.slotStepMin,
				slotMode,
				bookings: allBookingsForSlots,
				minNotice: 0,
				nowMin: 0,
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
					onClick: () => onSelectSlot(slot.startTime, blockDate),
				}
			}

			const isNotNull = <T,>(v: T | null): v is T => v !== null
			const dropZoneBlocks = slots.map(toDropZoneBlock).filter(isNotNull)

			const pendingBlock: CalendarBlock[] = (() => {
				if (!selectedSlot || blockDate !== date) return []
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
			})()

			return [
				...bookingBlocks,
				...breakBlocks,
				...dropZoneBlocks,
				...pendingBlock,
			]
		},

		renderSidebar() {
			return (
				<>
					<ServiceList
						eventTypes={eventTypes}
						selectedId={selectedEventTypeId}
						onSelect={onSelectEventType}
					/>
					<Separator className="my-4" />
					<SlotModeSelector value={slotMode} onChange={onModeChange} />
					{showScheduleEditor && (
						<>
							<Separator className="my-4" />
							<ScheduleSheetButton
								schedule={schedule}
								onSaveSchedule={onSaveSchedule}
								onSaveOverride={onSaveOverride}
								onSaveSlotMode={onSaveSlotMode}
							/>
						</>
					)}
				</>
			)
		},

		renderPanel() {
			if (selectedBooking && onCloseBooking && onBookingStatusChange) {
				const bookingEventType = findEventType(
					eventTypes,
					selectedBooking.eventTypeId,
				)
				return (
					<BookingDetailsPanel
						booking={selectedBooking}
						eventTypeName={bookingEventType?.name ?? ''}
						eventTypeColor={bookingEventType?.color ?? '#888'}
						onChangeStatus={onBookingStatusChange}
						onReschedule={onBookingReschedule ?? (async () => {})}
						onClose={onCloseBooking}
					/>
				)
			}

			return (
				<StaffBookingPanel
					selectedEventType={selectedEventType}
					selectedSlot={selectedSlot}
					slotMode={slotMode}
					confirmedBooking={confirmedBooking}
					formConfig={formConfig}
					onConfirmWithClient={onConfirmWithClient}
					onCancel={onCancel}
					onResetSlot={onResetSlot}
					isSubmitting={isSubmitting}
				/>
			)
		},

		onCellClick(clickDate: string, startMin: number) {
			if (!selectedEventType) return

			const workHours = getWorkHoursForDate(
				schedule.weeklyHours,
				clickDate,
				strategyStaffId ? overridesList : undefined,
				strategyStaffId,
			)
			if (!workHours) return

			const dayBookingsForSlots = getBookingsForDate(bookings, clickDate)
			const toSlotEngine = (b: CalendarDisplayBooking) => ({
				startMin: b.startMin,
				duration: b.duration,
			})
			const clickBreakBookings = strategyStaffId
				? getBreakBookings(overridesList, strategyStaffId, clickDate)
				: []

			const slots = getAvailableSlots({
				workStart: workHours.workStart,
				workEnd: workHours.workEnd,
				duration: selectedEventType.durationMin,
				slotStep: schedule.slotStepMin,
				slotMode,
				bookings: [
					...dayBookingsForSlots.map(toSlotEngine),
					...clickBreakBookings,
				],
				minNotice: 0,
				nowMin: 0,
			})

			const isAfterClick = (slot: { startMin: number }): boolean =>
				slot.startMin >= startMin
			const nearest = slots.find(isAfterClick)
			if (nearest) onSelectSlot(nearest.startTime, clickDate)
		},

		allowRangeSelect: false,

		getTitle(titleDate: string, view: ViewMode): string {
			if (view === 'week')
				return `${staffName} — ${formatWeekRange(getWeekDates(titleDate), calendarLocale)}`
			if (view === 'month')
				return `${staffName} — ${formatMonth(titleDate, calendarLocale)}`
			return `${staffName} — ${formatDateLocale(titleDate, calendarLocale)}`
		},
	}
}

export { createStaffStrategy }
export type { StaffStrategyParams }
