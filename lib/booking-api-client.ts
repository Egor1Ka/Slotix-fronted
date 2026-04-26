import type {
	StaffBySlugResponse,
	EventType,
	ScheduleTemplate,
	ScheduleOverride,
	CreateScheduleOverrideBody,
	CreateBookingBody,
	BookingResponse,
	StaffBooking,
	CancelByIdBody,
	OrgByIdResponse,
	OrgStaffMember,
	SlotMode,
	WeeklyHours,
} from '@/services/configs/booking.types'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'
import type { Slot } from './slot-engine'
import type {
	MergedBookingForm,
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
} from '@/services/configs/booking-field.types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

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

	const contentType = res.headers.get('content-type') ?? ''
	if (!contentType.includes('application/json')) {
		throw new Error(
			`API error: ${res.status} — expected JSON, got ${contentType || 'unknown'}`,
		)
	}

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
	description: string | null
	price: { amount: number; currency: string } | null
	bufferAfter: number
	minNotice: number
	slotStepMin: number
	active: boolean
	staffPolicy: 'any' | 'by_position' | 'specific'
	assignedPositions: string[]
	assignedStaff: string[]
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
	statusId: string
	status: BookingStatusObject
	inviteeSnapshot: { name: string; email: string | null; phone: string | null }
	clientNotes: string | null
	customFieldValues?: { fieldId: string; label: string; value: string }[]
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
	statusId: string
	status: BookingStatusObject
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
	description: raw.description ?? null,
	staffPolicy: raw.staffPolicy ?? 'any',
	assignedPositions: raw.assignedPositions ?? [],
	assignedStaff: raw.assignedStaff ?? [],
})

const toFrontendWeeklyHours = (raw: BackendWeeklyHours): WeeklyHours => ({
	dayOfWeek: DAY_TO_NUMBER[raw.day] ?? 0,
	enabled: raw.enabled,
	slots: raw.slots,
})

const toFrontendSchedule = (
	raw: BackendScheduleTemplate,
): ScheduleTemplate => ({
	staffId: raw.staffId,
	orgId: raw.orgId,
	weeklyHours: raw.weeklyHours.map(toFrontendWeeklyHours),
	slotStepMin: raw.slotStepMin,
	slotMode: raw.slotMode,
	timezone: raw.timezone,
})

const toFrontendBookingResponse = (
	raw: BackendBookingCreatedDto,
): BookingResponse => ({
	id: raw.id,
	eventTypeId: raw.eventTypeId,
	eventTypeName: raw.eventTypeName,
	staffId: raw.staffId,
	startAt: raw.startAt,
	endAt: raw.endAt,
	timezone: raw.timezone,
	locationId: raw.locationId,
	statusId: raw.statusId,
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
		statusId: raw.statusId,
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
		timezone: raw.timezone,
		payment: raw.payment,
	}
}

// ── Staff API ──

const getStaffById = async (
	id: string,
	orgId?: string,
): Promise<StaffBySlugResponse> => {
	const query = orgId ? `?orgId=${orgId}` : ''
	return get<StaffBySlugResponse>(`/staff/${id}${query}`)
}

// ── Event Types API ──

const getEventTypesByStaff = async (
	staffId: string,
	orgId?: string,
): Promise<EventType[]> => {
	const orgParam = orgId ? `&orgId=${orgId}` : ''
	const raw = await get<BackendEventType[]>(
		`/event-types?staffId=${staffId}${orgParam}`,
	)
	return raw.map(toFrontendEventType)
}

const getEventTypesByOrg = async (orgId: string): Promise<EventType[]> => {
	const raw = await get<BackendEventType[]>(`/event-types?orgId=${orgId}`)
	return raw.map(toFrontendEventType)
}

const getEventTypesByUser = async (userId: string): Promise<EventType[]> => {
	const raw = await get<BackendEventType[]>(`/event-types?userId=${userId}`)
	return raw.map(toFrontendEventType)
}

const getStaffForEventType = async (
	eventTypeId: string,
): Promise<OrgStaffMember[]> =>
	get<OrgStaffMember[]>(`/event-types/${eventTypeId}/staff`)

interface PositionPricing {
	id: string
	eventTypeId: string
	positionId: string
	price: { amount: number; currency: string }
}

const getPositionPricing = async (
	eventTypeId: string,
): Promise<PositionPricing[]> =>
	get<PositionPricing[]>(`/event-types/${eventTypeId}/position-pricing`)

const syncPositionPricing = async (
	eventTypeId: string,
	overrides: { positionId: string; amount: number | null }[],
): Promise<PositionPricing[]> =>
	put<PositionPricing[]>(`/event-types/${eventTypeId}/position-pricing`, {
		overrides,
	})

// ── Schedule API ──

const getScheduleTemplate = async (
	staffId: string,
	orgId?: string,
): Promise<ScheduleTemplate> => {
	const orgParam = orgId ? `&orgId=${orgId}` : ''
	const raw = await get<BackendScheduleTemplate>(
		`/schedule/template?staffId=${staffId}${orgParam}`,
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
	orgId: string | null,
	weeklyHours: WeeklyHours[],
	slotMode?: SlotMode,
	slotStepMin?: number,
	timezone?: string,
): Promise<ScheduleTemplate> => {
	const body = {
		staffId,
		...(orgId && { orgId }),
		weeklyHours: weeklyHours.map(toBackendWeeklyHours),
		...(slotMode !== undefined && { slotMode }),
		...(slotStepMin !== undefined && { slotStepMin }),
		...(timezone !== undefined && { timezone }),
	}
	const raw = await put<BackendScheduleTemplate>('/schedule/template', body)
	return toFrontendSchedule(raw)
}

const getSchedulesByOrg = async (
	orgId: string,
): Promise<ScheduleTemplate[]> => {
	const raw = await get<BackendScheduleTemplate[]>(
		`/schedule/templates/by-org/${orgId}`,
	)
	return raw.map(toFrontendSchedule)
}

const createScheduleOverride = async (
	body: CreateScheduleOverrideBody,
): Promise<ScheduleOverride> =>
	post<ScheduleOverride>('/schedule/override', body)

const getScheduleOverrides = async (
	staffId: string,
	orgId?: string,
): Promise<ScheduleOverride[]> => {
	const orgParam = orgId ? `&orgId=${orgId}` : ''
	return get<ScheduleOverride[]>(
		`/schedule/overrides?staffId=${staffId}${orgParam}`,
	)
}

const deleteScheduleOverride = async (overrideId: string): Promise<void> => {
	await del<void>(`/schedule/override/${overrideId}`)
}

const getScheduleOverridesByOrg = async (
	orgId: string,
): Promise<ScheduleOverride[]> =>
	get<ScheduleOverride[]>(`/schedule/overrides/by-org/${orgId}`)

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
	timezone: string,
	eventTypes: EventType[],
	statusIds?: string[],
	locationId?: string,
	orgId?: string,
): Promise<StaffBooking[]> => {
	const params = new URLSearchParams({
		staffId,
		dateFrom,
		dateTo,
		timezone,
	})
	if (statusIds && statusIds.length > 0)
		params.set('status', statusIds.join(','))
	if (locationId) params.set('locationId', locationId)
	if (orgId) params.set('orgId', orgId)

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
	statusId: string,
): Promise<BackendBookingDto> =>
	patch<BackendBookingDto>(`/bookings/${id}/status`, { statusId })

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

const updateStaffPosition = async (
	orgId: string,
	staffId: string,
	positionId: string | null,
): Promise<{ positionId: string | null }> =>
	patch<{ positionId: string | null }>(
		`/org/${orgId}/staff/${staffId}/position`,
		{ positionId },
	)

// ── Booking Status API ──

const getBookingStatuses = async (
	orgId?: string,
): Promise<BookingStatusObject[]> => {
	const params = orgId ? `?orgId=${orgId}` : ''
	return get<BookingStatusObject[]>(`/booking-statuses${params}`)
}

const createBookingStatus = async (body: {
	label: string
	color: string
	actions?: string[]
	orgId?: string
}): Promise<BookingStatusObject> =>
	post<BookingStatusObject>('/booking-statuses', body)

const updateBookingStatus2 = async (
	id: string,
	body: { label?: string; color?: string; actions?: string[]; order?: number },
): Promise<BookingStatusObject> =>
	patch<BookingStatusObject>(`/booking-statuses/${id}`, body)

const archiveBookingStatus = async (id: string): Promise<BookingStatusObject> =>
	patch<BookingStatusObject>(`/booking-statuses/${id}/archive`, {})

const restoreBookingStatus = async (id: string): Promise<BookingStatusObject> =>
	patch<BookingStatusObject>(`/booking-statuses/${id}/restore`, {})

export const bookingStatusApi = {
	getAll: getBookingStatuses,
	create: createBookingStatus,
	update: updateBookingStatus2,
	archive: archiveBookingStatus,
	restore: restoreBookingStatus,
}

// ── Exports ──

export const staffApi = {
	getById: getStaffById,
}

export const eventTypeApi = {
	getByStaff: getEventTypesByStaff,
	getByOrg: getEventTypesByOrg,
	getByUser: getEventTypesByUser,
	getStaffForEventType,
	getPositionPricing,
	syncPositionPricing,
}

export type { PositionPricing }

export const scheduleApi = {
	getTemplate: getScheduleTemplate,
	getByOrg: getSchedulesByOrg,
	updateTemplate: updateScheduleTemplate,
	createOverride: createScheduleOverride,
	getOverrides: getScheduleOverrides,
	getOverridesByOrg: getScheduleOverridesByOrg,
	deleteOverride: deleteScheduleOverride,
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
	updateStaffPosition,
}

// ── Booking Form API ──

const getMergedBookingForm = async (
	eventTypeId: string,
): Promise<MergedBookingForm> =>
	get<MergedBookingForm>(`/booking-form/${eventTypeId}`)

const getBookingFields = async (
	ownerId: string,
	ownerType: 'org' | 'user',
	eventTypeId?: string | null,
): Promise<BookingField[]> => {
	const params = new URLSearchParams({ ownerId, ownerType })
	if (eventTypeId) params.set('eventTypeId', eventTypeId)
	return get<BookingField[]>(`/booking-fields?${params}`)
}

const createBookingField = async (
	body: CreateBookingFieldBody,
): Promise<BookingField> => post<BookingField>('/booking-fields', body)

const updateBookingField = async (
	id: string,
	body: UpdateBookingFieldBody,
): Promise<BookingField> => patch<BookingField>(`/booking-fields/${id}`, body)

const removeBookingField = async (id: string): Promise<void> => {
	await del<void>(`/booking-fields/${id}`)
}

export const bookingFormApi = {
	getMergedForm: getMergedBookingForm,
}

export const bookingFieldApi = {
	getFields: getBookingFields,
	create: createBookingField,
	update: updateBookingField,
	remove: removeBookingField,
}
