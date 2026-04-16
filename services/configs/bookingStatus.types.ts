interface BookingStatusObject {
	id: string
	label: string
	color: string
	actions: string[]
	isDefault: boolean
	isArchived: boolean
	orgId: string | null
	userId: string | null
	order: number
}

interface CreateBookingStatusBody {
	label: string
	color: string
	actions?: string[]
	orgId?: string
}

interface UpdateBookingStatusBody {
	label?: string
	color?: string
	actions?: string[]
	order?: number
}

export type {
	BookingStatusObject,
	CreateBookingStatusBody,
	UpdateBookingStatusBody,
}
