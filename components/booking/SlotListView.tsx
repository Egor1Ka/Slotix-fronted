'use client'

import { useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { uk, enUS } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { ServiceList } from './ServiceList'
import { TimeSlotGrid } from './TimeSlotGrid'
import { StaffSlotCard } from './StaffSlotCard'
import { BookingFlowDialog } from './BookingFlowDialog'
import { useFindNearestSlots } from '@/lib/calendar/hooks/useFindNearestSlots'
import { formatYMD } from '@/lib/calendar/utils'
import type { ClientInfoData } from './ClientInfoForm'
import type {
	EventType,
	ScheduleTemplate,
	ScheduleOverride,
	StaffBooking,
	OrgStaffMember,
} from '@/services/configs/booking.types'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'
import type { ConfirmedBooking } from '@/lib/calendar/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface SlotListViewProps {
	variant: 'org' | 'personal'
	eventTypes: EventType[]
	selectedEventTypeId: string | null
	onEventTypeSelect: (id: string) => void
	loading?: boolean
	// Personal mode
	schedule?: ScheduleTemplate | null
	overrides?: ScheduleOverride[]
	bookings?: StaffBooking[]
	staffId?: string
	// Org mode
	staff?: OrgStaffMember[]
	filterStaffId?: string | null
	getStaffSchedule?: (staffId: string) => ScheduleTemplate | null
	getStaffOverrides?: (staffId: string) => ScheduleOverride[]
	getStaffBookings?: (staffId: string) => StaffBooking[]
	// Date (source of truth from URL)
	dateStr: string
	onDateChange: (date: string) => void
	// Booking
	formConfig: MergedBookingForm | null
	onConfirmWithClient: (
		data: ClientInfoData,
		overrides?: { slotTime?: string; date?: string; staffId?: string },
	) => Promise<ConfirmedBooking | null>
	isSubmitting: boolean
	shareUrl: string
	onBookAgain: () => void
	onSuccessNavigate?: (result: ConfirmedBooking) => void
}

interface PersonalSlotViewProps {
	schedule: ScheduleTemplate | null
	overrides: ScheduleOverride[]
	bookings: StaffBooking[]
	duration: number
	startDate: string
	fixedDate: boolean
	staffId?: string
	selectedSlot: string | null
	onSlotSelect: (time: string) => void
	disabled?: boolean
}

interface OrgStaffSlotItemProps {
	member: OrgStaffMember
	schedule: ScheduleTemplate | null
	overrides: ScheduleOverride[]
	bookings: StaffBooking[]
	duration: number
	startDate: string
	fixedDate: boolean
	selectedSlot: string | null
	selectedStaffId: string | null
	onSlotSelect: (staffId: string, time: string) => void
	scheduleTimezone: string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PersonalSlotView({
	schedule,
	overrides,
	bookings,
	duration,
	startDate,
	fixedDate,
	staffId,
	selectedSlot,
	onSlotSelect,
	disabled = false,
}: PersonalSlotViewProps) {
	const { slots } = useFindNearestSlots({
		schedule,
		overrides,
		bookings,
		duration,
		startDate,
		fixedDate,
		staffId,
	})

	const handleSelect = (time: string) => {
		onSlotSelect(time)
	}

	return (
		<TimeSlotGrid
			slots={slots}
			selectedSlot={selectedSlot}
			onSelect={handleSelect}
			disabled={disabled}
		/>
	)
}

function OrgStaffSlotItem({
	member,
	schedule,
	overrides,
	bookings,
	duration,
	startDate,
	fixedDate,
	selectedSlot,
	selectedStaffId,
	onSlotSelect,
	scheduleTimezone,
}: OrgStaffSlotItemProps) {
	const { date, slots } = useFindNearestSlots({
		schedule,
		overrides,
		bookings,
		duration,
		startDate,
		fixedDate,
		staffId: member.id,
	})

	return (
		<StaffSlotCard
			staff={member}
			slots={slots}
			date={date}
			selectedSlot={selectedSlot}
			selectedStaffId={selectedStaffId}
			onSlotSelect={onSlotSelect}
			scheduleTimezone={scheduleTimezone}
		/>
	)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DATE_FNS_LOCALES: Record<string, Locale> = {
	uk,
	en: enUS,
}

const getDateFnsLocale = (locale: string): Locale =>
	DATE_FNS_LOCALES[locale] ?? enUS

const dateToISO = (date: Date): string =>
	formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate()) // tz-ok: date constructed from tz-correct YYYY-MM-DD string via new Date(dateStr+'T00:00:00'); local-tz parts reproduce the same date

const getSelectedEventType = (
	eventTypes: EventType[],
	selectedId: string | null,
): EventType | null => {
	if (!selectedId) return null
	return eventTypes.find((et) => et.id === selectedId) ?? null
}

const getStaffById = (
	staff: OrgStaffMember[],
	staffId: string | null,
): OrgStaffMember | null => {
	if (!staffId) return null
	return staff.find((s) => s.id === staffId) ?? null
}

// ── Main Component ────────────────────────────────────────────────────────────

function SlotListView({
	variant,
	eventTypes,
	selectedEventTypeId,
	onEventTypeSelect,
	loading = false,
	schedule = null,
	overrides = [],
	bookings = [],
	staffId,
	staff = [],
	filterStaffId = null,
	getStaffSchedule,
	getStaffOverrides,
	getStaffBookings,
	dateStr,
	onDateChange,
	formConfig,
	onConfirmWithClient,
	isSubmitting,
	shareUrl,
	onBookAgain,
	onSuccessNavigate,
}: SlotListViewProps) {
	const t = useTranslations('booking')
	const locale = useLocale()
	const dateFnsLocale = getDateFnsLocale(locale)

	const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
	const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
	const [sheetOpen, setSheetOpen] = useState(false)
	const [pendingSlot, setPendingSlot] = useState<
		{ staffId: string; time: string } | null
	>(null)
	const serviceListRef = useRef<HTMLDivElement>(null)
	const [highlightServices, setHighlightServices] = useState(false)

	const displayStaff = filterStaffId
		? staff.filter((member) => member.id === filterStaffId)
		: staff

	const selectedEventType = getSelectedEventType(
		eventTypes,
		selectedEventTypeId,
	)
	const duration = selectedEventType ? selectedEventType.durationMin : 30
	const startDate = dateStr
	const fixedDate = true

	const handleCalendarSelect = (date: Date | undefined) => {
		if (!date) return
		onDateChange(dateToISO(date))
		setSelectedSlot(null)
	}

	const handlePersonalSlotSelect = (time: string) => {
		if (!selectedEventTypeId) {
			serviceListRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
			triggerServiceListHighlight()
			toast.info(t('pickServiceThenTime', { time }))
			return
		}
		setSelectedSlot(time)
		setSelectedStaffId(null)
		setSheetOpen(true)
	}

	const getStaffMember = (id: string): OrgStaffMember | null =>
		staff.find((member) => member.id === id) ?? null

	const isServiceForStaff =
		(currentStaffId: string) =>
		(et: EventType): boolean => {
			if (et.staffPolicy === 'any') return true
			if (et.staffPolicy === 'specific')
				return et.assignedStaff.includes(currentStaffId)
			if (et.staffPolicy === 'by_position') {
				const member = getStaffMember(currentStaffId)
				if (!member || !member.positionId) return false
				return et.assignedPositions.includes(member.positionId)
			}
			return false
		}

	const allowedIdsForPendingSlot: Set<string> | undefined = pendingSlot
		? new Set(
				eventTypes
					.filter(isServiceForStaff(pendingSlot.staffId))
					.map((et) => et.id),
			)
		: undefined

	const triggerServiceListHighlight = () => {
		setHighlightServices(true)
		setTimeout(() => setHighlightServices(false), 1500)
	}

	const handleOrgSlotSelect = (staffMemberId: string, time: string) => {
		if (selectedEventTypeId) {
			setSelectedSlot(time)
			setSelectedStaffId(staffMemberId)
			setSheetOpen(true)
			return
		}

		const allowed = eventTypes.filter(isServiceForStaff(staffMemberId))
		if (allowed.length === 0) {
			toast.error(t('noServicesForStaff'))
			return
		}

		setPendingSlot({ staffId: staffMemberId, time })
		serviceListRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		})
		triggerServiceListHighlight()
		toast.info(t('pickServiceThenTime', { time }))
	}

	const handleEventTypeSelectWrapped = (serviceId: string) => {
		onEventTypeSelect(serviceId)
		if (pendingSlot) setPendingSlot(null)
	}

	const handleSheetOpenChange = (open: boolean) => {
		setSheetOpen(open)
		if (!open) {
			setSelectedSlot(null)
			setSelectedStaffId(null)
		}
	}

	const handleDialogSubmit = (data: ClientInfoData) =>
		onConfirmWithClient(data, {
			slotTime: selectedSlot ?? undefined,
			date: startDate,
			staffId: selectedStaffId ?? staffId ?? undefined,
		})

	const handleDialogBookAgain = () => {
		setSheetOpen(false)
		setSelectedSlot(null)
		setSelectedStaffId(null)
		onBookAgain()
	}

	const selectedOrgStaff =
		variant === 'org' ? getStaffById(staff, selectedStaffId) : null

	const sheetStaffName =
		variant === 'personal'
			? null
			: selectedOrgStaff
				? selectedOrgStaff.name
				: null
	const sheetStaffAvatar =
		variant === 'personal'
			? null
			: selectedOrgStaff
				? selectedOrgStaff.avatar
				: null

	const renderOrgStaffItem = (member: OrgStaffMember) => {
		if (!getStaffSchedule || !getStaffOverrides || !getStaffBookings)
			return null

		const memberSchedule = getStaffSchedule(member.id)
		if (!memberSchedule) return null

		return (
			<OrgStaffSlotItem
				key={member.id}
				member={member}
				schedule={memberSchedule}
				overrides={getStaffOverrides(member.id)}
				bookings={getStaffBookings(member.id)}
				duration={duration}
				startDate={startDate}
				fixedDate={fixedDate}
				selectedSlot={selectedSlot}
				selectedStaffId={selectedStaffId}
				onSlotSelect={handleOrgSlotSelect}
				scheduleTimezone={memberSchedule.timezone}
			/>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Service selection */}
			<div
				ref={serviceListRef}
				className={cn(
					'rounded-lg transition-all',
					highlightServices && 'ring-primary/40 ring-2 ring-offset-2',
				)}
			>
				<ServiceList
					eventTypes={eventTypes}
					selectedId={selectedEventTypeId}
					onSelect={handleEventTypeSelectWrapped}
					loading={loading}
					variant="horizontal"
					allowedIds={allowedIdsForPendingSlot}
				/>
			</div>

			{/* Date picker + slots — side by side on desktop */}
			<div className="flex flex-col gap-4 md:flex-row md:items-start">
				<Calendar
					mode="single"
					selected={new Date(dateStr + 'T00:00:00')}
					onSelect={handleCalendarSelect}
					disabled={{ before: new Date() }}
					locale={dateFnsLocale}
					className="shrink-0 rounded-lg border p-2"
				/>

				<div className="flex flex-1 flex-col gap-3">
					{variant === 'personal' && (
						<PersonalSlotView
							schedule={schedule ?? null}
							overrides={overrides}
							bookings={bookings}
							duration={duration}
							startDate={startDate}
							fixedDate={fixedDate}
							staffId={staffId}
							selectedSlot={selectedSlot}
							onSlotSelect={handlePersonalSlotSelect}
						/>
					)}

					{variant === 'org' && (
						<div className="flex flex-col gap-3">
							{displayStaff.map(renderOrgStaffItem)}
						</div>
					)}
				</div>
			</div>

			{/* Booking confirm sheet */}
			<BookingFlowDialog
				open={sheetOpen}
				onOpenChange={handleSheetOpenChange}
				eventType={selectedEventType}
				staffName={sheetStaffName}
				staffAvatar={sheetStaffAvatar}
				slotTime={selectedSlot}
				slotDate={dateStr}
				formConfig={formConfig}
				onSubmit={handleDialogSubmit}
				isSubmitting={isSubmitting}
				shareUrl={shareUrl}
				onBookAgain={handleDialogBookAgain}
				onSuccessNavigate={onSuccessNavigate}
			/>
		</div>
	)
}

export { SlotListView }
export type { SlotListViewProps }
