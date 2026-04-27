import type { CustomFieldValue } from './booking-field.types'
import type { BookingStatusObject } from './bookingStatus.types'

// ── Staff ──

interface StaffMember {
	id: string
	name: string
	avatar: string
	ogImage: string | null
	position: string | null
	bio: string | null
}

interface StaffBySlugResponse {
	id: string
	name: string
	avatar: string
	ogImage: string | null
	position: string | null
	orgId: string | null
	locationIds: string[]
	bio: string | null
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	orgName: string | null
	orgLogo: string | null
}

// ── Event Type (Service) ──

interface EventType {
	id: string
	name: string
	slug: string
	image: string
	ogImage: string | null
	durationMin: number
	price: number
	currency: string
	color: string
	description: string | null
	staffPolicy: 'any' | 'by_position' | 'specific'
	assignedPositions: string[]
	assignedStaff: string[]
}

// ── Schedule ──

interface WeeklyHours {
	dayOfWeek: number
	enabled: boolean
	slots: TimeRange[]
}

interface TimeRange {
	start: string
	end: string
}

interface ScheduleTemplate {
	staffId: string
	orgId: string | null
	weeklyHours: WeeklyHours[]
	slotStepMin: number
	slotMode: SlotMode
	timezone: string
}

type SlotMode = 'fixed' | 'optimal' | 'dynamic'

interface ScheduleOverride {
	id: string
	staffId: string
	date: string
	enabled: boolean
	slots: TimeRange[]
	reason: string | null
}

interface CreateScheduleOverrideBody {
	staffId: string
	orgId?: string
	date: string
	enabled: boolean
	slots: TimeRange[]
	reason?: string
}

// ── Booking ──

interface Invitee {
	name: string
	email: string | null
	phone: string | null
	phoneCountry: string | null
}

interface CreateBookingBody {
	eventTypeId: string
	staffId: string
	startAt: string
	timezone: string
	invitee: Invitee
	customFieldValues?: CustomFieldValue[]
}

interface BookingResponse {
	id: string
	eventTypeId: string
	eventTypeName: string
	staffId: string
	startAt: string
	endAt: string
	timezone: string
	locationId: string | null
	statusId: string
	status: BookingStatusObject
	cancelToken: string
	invitee: Invitee
	createdAt: string
}

interface BookingPayment {
	status: string
	amount: number
	currency: string
}

interface StaffBooking {
	id: string
	eventTypeId: string
	eventTypeName: string
	startAt: string
	endAt: string
	timezone: string
	statusId: string
	status: BookingStatusObject
	invitee: Invitee
	color: string
	locationId: string | null
	orgId: string | null
	payment: BookingPayment
}

interface CancelByIdBody {
	bookingId: string
	reason?: string
}

// ── Org ──

interface OrgByIdResponse {
	id: string
	name: string
	logo: string | null
	ogImage: string | null
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	active: boolean
	timezone?: string
}

interface OrgStaffMember extends StaffMember {
	bookingCount: number
	status?: 'active' | 'invited' | 'suspended'
	positionId?: string | null
	displayName?: string | null
}

// ── Calendar Display ──

interface CalendarDisplayBooking {
	startMin: number
	duration: number
	label: string
	color: string
	date: string
	bookingId: string
	statusId: string
	status: BookingStatusObject
	staffName: string
	staffAvatar: string
	timezone: string
}

export type {
	SlotMode,
	StaffMember,
	StaffBySlugResponse,
	EventType,
	WeeklyHours,
	TimeRange,
	ScheduleTemplate,
	ScheduleOverride,
	CreateScheduleOverrideBody,
	Invitee,
	CreateBookingBody,
	BookingResponse,
	BookingPayment,
	StaffBooking,
	CancelByIdBody,
	OrgByIdResponse,
	OrgStaffMember,
	CalendarDisplayBooking,
}

export type { BookingStatusObject } from './bookingStatus.types'
