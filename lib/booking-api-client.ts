import type {
	StaffBySlugResponse,
	EventType,
	ScheduleTemplate,
	ScheduleOverride,
	CreateScheduleOverrideBody,
	CreateBookingBody,
	BookingResponse,
	StaffBooking,
	BookingStatus,
	CancelByIdBody,
	OrgByIdResponse,
	OrgStaffMember,
	SlotMode,
	WeeklyHours,
} from '@/services/configs/booking.types'
import type { Slot } from './slot-engine'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9000'

// ── HTTP helpers ──

interface ApiResponse<T> {
	data: T
	statusCode: number
	status: string
}

const fetchApi = async <T>(
	path: string,
	options: RequestInit = {},
): Promise<T> => {
	const url = `${API_URL}/api${path}`
	const res = await fetch(url, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
		...options,
	})

	const json: ApiResponse<T> = await res.json()

	if (!res.ok) {
		throw new Error(json.status || `API error: ${res.status}`)
	}

	return json.data
}

const get = <T>(path: string): Promise<T> => fetchApi<T>(path)

const post = <T>(path: string, body: unknown): Promise<T> =>
	fetchApi<T>(path, { method: 'POST', body: JSON.stringify(body) })

const put = <T>(path: string, body: unknown): Promise<T> =>
	fetchApi<T>(path, { method: 'PUT', body: JSON.stringify(body) })

const patch = <T>(path: string, body: unknown): Promise<T> =>
	fetchApi<T>(path, { method: 'PATCH', body: JSON.stringify(body) })

const del = <T>(path: string, body?: unknown): Promise<T> =>
	fetchApi<T>(path, {
		method: 'DELETE',
		...(body ? { body: JSON.stringify(body) } : {}),
	})

// ── Backend response shapes (what the API actually returns) ──

interface BackendEventType {
	id: string
	userId: string | null
	orgId: string | null
	slug: string
	name: string
	durationMin: number
	type: string
	color: string
	price: { amount: number; currency: string } | null
	bufferAfter: number
	minNotice: number
	slotStepMin: number
	active: boolean
}

interface BackendWeeklyHours {
	day: string
	enabled: boolean
	slots: { start: string; end: string }[]
}

interface BackendScheduleTemplate {
	id: string
	staffId: string
	orgId: string | null
	locationId: string | null
	validFrom: string
	validTo: string | null
	timezone: string
	slotMode: SlotMode
	slotStepMin: number
	weeklyHours: BackendWeeklyHours[]
}

interface BackendBookingDto {
	id: string
	eventTypeId: string
	hosts: { userId: string; role: string }[]
	inviteeId: string
	orgId: string | null
	locationId: string | null
	startAt: string
	endAt: string
	timezone: string
	status: BookingStatus
	inviteeSnapshot: { name: string; email: string | null; phone: string | null }
	clientNotes: string | null
	payment: { status: string; amount: number; currency: string }
	createdAt: string
	updatedAt: string
}

interface BackendBookingCreatedDto {
	id: string
	eventTypeId: string
	eventTypeName: string
	staffId: string
	startAt: string
	endAt: string
	timezone: string
	locationId: string | null
	status: BookingStatus
	cancelToken: string
	invitee: { name: string; email: string | null; phone: string | null }
	payment: { status: string; amount: number; currency: string }
	createdAt: string
}

// ── Transformers: Backend → Frontend types ──

const DAY_TO_NUMBER: Record<string, number> = {
	sun: 0,
	mon: 1,
	tue: 2,
	wed: 3,
	thu: 4,
	fri: 5,
	sat: 6,
}

const toFrontendEventType = (raw: BackendEventType): EventType => ({
	id: raw.id,
	name: raw.name,
	slug: raw.slug,
	durationMin: raw.durationMin,
	price: raw.price ? raw.price.amount : 0,
	currency: raw.price ? raw.price.currency : 'usd',
	color: raw.color,
	description: null,
})

const toFrontendWeeklyHours = (raw: BackendWeeklyHours): WeeklyHours => ({
	dayOfWeek: DAY_TO_NUMBER[raw.day] ?? 0,
	enabled: raw.enabled,
	slots: raw.slots,
})

const toFrontendSchedule = (raw: BackendScheduleTemplate): ScheduleTemplate => ({
	staffId: raw.staffId,
	orgId: raw.orgId,
	weeklyHours: raw.weeklyHours.map(toFrontendWeeklyHours),
	slotStepMin: raw.slotStepMin,
	slotMode: raw.slotMode,
	timezone: raw.timezone,
})

const toFrontendBookingResponse = (raw: BackendBookingCreatedDto): BookingResponse => ({
	id: raw.id,
	eventTypeId: raw.eventTypeId,
	eventTypeName: raw.eventTypeName,
	staffId: raw.staffId,
	startAt: raw.startAt,
	endAt: raw.endAt,
	timezone: raw.timezone,
	locationId: raw.locationId,
	status: raw.status,
	cancelToken: raw.cancelToken,
	invitee: {
		name: raw.invitee.name,
		email: raw.invitee.email,
		phone: raw.invitee.phone,
		phoneCountry: null,
	},
	createdAt: raw.createdAt,
})

const toFrontendStaffBooking = (
	raw: BackendBookingDto,
	eventTypes: EventType[],
): StaffBooking => {
	const eventType = eventTypes.find((et) => et.id === raw.eventTypeId)
	return {
		id: raw.id,
		eventTypeId: raw.eventTypeId,
		eventTypeName: eventType ? eventType.name : '',
		startAt: raw.startAt,
		endAt: raw.endAt,
		status: raw.status,
		invitee: {
			name: raw.inviteeSnapshot.name,
			email: raw.inviteeSnapshot.email,
			phone: raw.inviteeSnapshot.phone,
			phoneCountry: null,
		},
		color: eventType ? eventType.color : '#888888',
		locationId: raw.locationId,
		orgId: raw.orgId,
	}
}

// ── Staff API ──

const getStaffById = async (id: string): Promise<StaffBySlugResponse> =>
	get<StaffBySlugResponse>(`/staff/${id}`)

// ── Event Types API ──

const getEventTypesByStaff = async (staffId: string): Promise<EventType[]> => {
	const raw = await get<BackendEventType[]>(`/event-types?staffId=${staffId}`)
	return raw.map(toFrontendEventType)
}

// ── Schedule API ──

const getScheduleTemplate = async (staffId: string): Promise<ScheduleTemplate> => {
	const raw = await get<BackendScheduleTemplate>(
		`/schedule/template?staffId=${staffId}`,
	)
	return toFrontendSchedule(raw)
}

const NUMBER_TO_DAY: Record<number, string> = {
	0: 'sun',
	1: 'mon',
	2: 'tue',
	3: 'wed',
	4: 'thu',
	5: 'fri',
	6: 'sat',
}

const toBackendWeeklyHours = (wh: WeeklyHours): BackendWeeklyHours => ({
	day: NUMBER_TO_DAY[wh.dayOfWeek] ?? 'mon',
	enabled: wh.enabled,
	slots: wh.slots,
})

const updateScheduleTemplate = async (
	staffId: string,
	_orgId: string | null,
	weeklyHours: WeeklyHours[],
	slotMode?: SlotMode,
	slotStepMin?: number,
): Promise<ScheduleTemplate> => {
	const body = {
		staffId,
		weeklyHours: weeklyHours.map(toBackendWeeklyHours),
		...(slotMode !== undefined && { slotMode }),
		...(slotStepMin !== undefined && { slotStepMin }),
	}
	const raw = await put<BackendScheduleTemplate>('/schedule/template', body)
	return toFrontendSchedule(raw)
}

const createScheduleOverride = async (
	body: CreateScheduleOverrideBody,
): Promise<ScheduleOverride> =>
	post<ScheduleOverride>('/schedule/override', body)

// ── Booking API ──

const createBooking = async (
	body: CreateBookingBody,
): Promise<BookingResponse> => {
	const raw = await post<BackendBookingCreatedDto>('/bookings', body)
	return toFrontendBookingResponse(raw)
}

const getStaffBookings = async (
	staffId: string,
	dateFrom: string,
	dateTo: string,
	eventTypes: EventType[],
	status?: BookingStatus[],
	locationId?: string,
): Promise<StaffBooking[]> => {
	const params = new URLSearchParams({
		staffId,
		dateFrom,
		dateTo,
	})
	if (status && status.length > 0) params.set('status', status.join(','))
	if (locationId) params.set('locationId', locationId)

	const raw = await get<BackendBookingDto[]>(`/bookings/by-staff?${params}`)
	const enrichBooking = (b: BackendBookingDto): StaffBooking =>
		toFrontendStaffBooking(b, eventTypes)
	return raw.map(enrichBooking)
}

const cancelById = async (
	body: CancelByIdBody,
): Promise<BookingResponse | null> => {
	await del(`/bookings/${body.bookingId}`, { reason: body.reason })
	return null
}

const getBookingById = async (id: string): Promise<BackendBookingDto> =>
	get<BackendBookingDto>(`/bookings/${id}`)

const updateBookingStatus = async (
	id: string,
	status: BookingStatus,
): Promise<BackendBookingDto> =>
	patch<BackendBookingDto>(`/bookings/${id}/status`, { status })

const rescheduleBooking = async (
	id: string,
	startAt: string,
): Promise<BackendBookingDto> =>
	patch<BackendBookingDto>(`/bookings/${id}/reschedule`, { startAt })

// ── Slots API ──

const getAvailableSlots = async (
	staffId: string,
	eventTypeId: string,
	date: string,
	locationId?: string,
	slotMode?: SlotMode,
): Promise<Slot[]> => {
	const params = new URLSearchParams({ staffId, eventTypeId, date })
	if (locationId) params.set('locationId', locationId)
	if (slotMode) params.set('slotMode', slotMode)

	return get<Slot[]>(`/slots?${params}`)
}

// ── Org API ──

const getOrgById = async (id: string): Promise<OrgByIdResponse> =>
	get<OrgByIdResponse>(`/org/${id}`)

const getOrgStaff = async (
	id: string,
	date?: string,
): Promise<OrgStaffMember[]> => {
	const params = date ? `?date=${date}` : ''
	return get<OrgStaffMember[]>(`/org/${id}/staff${params}`)
}

// ── Exports ──

export const staffApi = {
	getById: getStaffById,
}

export const eventTypeApi = {
	getByStaff: getEventTypesByStaff,
}

export const scheduleApi = {
	getTemplate: getScheduleTemplate,
	updateTemplate: updateScheduleTemplate,
	createOverride: createScheduleOverride,
}

export const bookingApi = {
	create: createBooking,
	getByStaff: getStaffBookings,
	getById: getBookingById,
	updateStatus: updateBookingStatus,
	reschedule: rescheduleBooking,
	cancelById,
}

export const slotsApi = {
	getAvailable: getAvailableSlots,
}

export const orgApi = {
	getById: getOrgById,
	getStaff: getOrgStaff,
}
