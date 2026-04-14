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
	filterStaffId = null,
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
	const [servicePicker, setServicePicker] = useState<
		{ staffId: string; time: string } | null
	>(null)

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
		setSelectedSlot(time)
		setSelectedStaffId(null)
		setSheetOpen(true)
	}

	const handleOrgSlotSelect = (staffMemberId: string, time: string) => {
		if (!selectedEventTypeId) {
			setServicePicker({ staffId: staffMemberId, time })
			return
		}
		setSelectedSlot(time)
		setSelectedStaffId(staffMemberId)
		setSheetOpen(true)
	}

	const handleServicePick = (serviceId: string) => {
		if (!servicePicker) return
		onEventTypeSelect(serviceId)
		setSelectedSlot(servicePicker.time)
		setSelectedStaffId(servicePicker.staffId)
		setSheetOpen(true)
		setServicePicker(null)
	}

	const handleServicePickerCancel = () => setServicePicker(null)

	const isServiceForStaff =
		(currentStaffId: string) =>
		(et: EventType): boolean =>
			et.assignedStaff.includes(currentStaffId)

	const servicesForPicker: EventType[] = servicePicker
		? eventTypes.filter(isServiceForStaff(servicePicker.staffId))
		: []

	const renderPickableService = (service: EventType) => {
		const handleClick = () => handleServicePick(service.id)
		return (
			<button
				key={service.id}
				type="button"
				onClick={handleClick}
				className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
			>
				<span
					className="size-2.5 rounded-full"
					style={{ backgroundColor: service.color }}
				/>
				<span className="flex-1 font-medium">{service.name}</span>
				<span className="text-muted-foreground text-xs">
					{service.durationMin} {t('min')}
				</span>
			</button>
		)
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

					{variant === 'org' && (
						<div className="flex flex-col gap-3">
							{servicePicker && (
								<div className="rounded-lg border p-3">
									<div className="text-muted-foreground mb-2 text-xs font-semibold">
										{t('pickServiceTitle')}
									</div>
									{servicesForPicker.length === 0 ? (
										<div className="text-muted-foreground text-xs">
											{t('noServicesForSlot')}
										</div>
									) : (
										<div className="flex flex-col gap-1">
											{servicesForPicker.map(renderPickableService)}
										</div>
									)}
									<button
										type="button"
										onClick={handleServicePickerCancel}
										className="text-muted-foreground hover:text-foreground mt-2 text-xs"
									>
										{t('cancel')}
									</button>
								</div>
							)}
							{displayStaff.map(renderOrgStaffItem)}
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
