'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar } from '@/components/ui/calendar'
import { ServiceList } from './ServiceList'
import { TimeSlotGrid } from './TimeSlotGrid'
import { StaffSlotCard } from './StaffSlotCard'
import { BookingConfirmSheet } from './BookingConfirmSheet'
import { useFindNearestSlots } from '@/lib/calendar/hooks/useFindNearestSlots'
import type { ClientInfoData } from './ClientInfoForm'
import type {
	EventType,
	ScheduleTemplate,
	ScheduleOverride,
	StaffBooking,
	OrgStaffMember,
} from '@/services/configs/booking.types'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'

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
	) => Promise<void>
	isSubmitting: boolean
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
		/>
	)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const dateToISO = (date: Date): string => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

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
	getStaffSchedule,
	getStaffOverrides,
	getStaffBookings,
	dateStr,
	onDateChange,
	formConfig,
	onConfirmWithClient,
	isSubmitting,
}: SlotListViewProps) {
	const t = useTranslations('booking')

	const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
	const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
	const [sheetOpen, setSheetOpen] = useState(false)

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
		setSelectedSlot(time)
		setSelectedStaffId(null)
		setSheetOpen(true)
	}

	const handleOrgSlotSelect = (staffMemberId: string, time: string) => {
		setSelectedSlot(time)
		setSelectedStaffId(staffMemberId)
		setSheetOpen(true)
	}

	const handleSheetOpenChange = (open: boolean) => {
		setSheetOpen(open)
		if (!open) {
			setSelectedSlot(null)
			setSelectedStaffId(null)
		}
	}

	const handleConfirm = async (data: ClientInfoData) => {
		await onConfirmWithClient(data, {
			slotTime: selectedSlot ?? undefined,
			date: startDate,
			staffId: selectedStaffId ?? staffId ?? undefined,
		})
		setSheetOpen(false)
		setSelectedSlot(null)
		setSelectedStaffId(null)
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

		return (
			<OrgStaffSlotItem
				key={member.id}
				member={member}
				schedule={getStaffSchedule(member.id)}
				overrides={getStaffOverrides(member.id)}
				bookings={getStaffBookings(member.id)}
				duration={duration}
				startDate={startDate}
				fixedDate={fixedDate}
				selectedSlot={selectedSlot}
				selectedStaffId={selectedStaffId}
				onSlotSelect={handleOrgSlotSelect}
			/>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Service selection */}
			<ServiceList
				eventTypes={eventTypes}
				selectedId={selectedEventTypeId}
				onSelect={onEventTypeSelect}
				loading={loading}
				variant="horizontal"
			/>

			{/* Date picker + slots — side by side on desktop */}
			<div className="flex flex-col gap-4 md:flex-row md:items-start">
				<Calendar
					mode="single"
					selected={new Date(dateStr + 'T00:00:00')}
					onSelect={handleCalendarSelect}
					disabled={{ before: new Date() }}
					className="shrink-0 rounded-lg border p-2"
				/>

				<div className="flex flex-1 flex-col gap-3">
					{!selectedEventTypeId && (
						<p className="text-muted-foreground text-center text-xs">
							{t('selectServiceFirst')}
						</p>
					)}

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
							disabled={!selectedEventTypeId}
						/>
					)}

					{variant === 'org' && selectedEventTypeId && (
						<div className="flex flex-col gap-3">
							{staff.map(renderOrgStaffItem)}
						</div>
					)}
				</div>
			</div>

			{/* Booking confirm sheet */}
			<BookingConfirmSheet
				open={sheetOpen}
				onOpenChange={handleSheetOpenChange}
				eventType={selectedEventType}
				staffName={sheetStaffName}
				staffAvatar={sheetStaffAvatar}
				slotTime={selectedSlot}
				slotDate={dateStr}
				formConfig={formConfig}
				onConfirm={handleConfirm}
				isSubmitting={isSubmitting}
			/>
		</div>
	)
}

export { SlotListView }
export type { SlotListViewProps }
