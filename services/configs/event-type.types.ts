type StaffPolicy = 'any' | 'by_position' | 'specific'

interface CreateEventTypeBody {
	orgId: string
	name: string
	durationMin: number
	price: number
	currency: string
	color?: string
	description?: string
	staffPolicy: StaffPolicy
	assignedPositions?: string[]
	assignedStaff?: string[]
}

interface UpdateEventTypeBody {
	name?: string
	durationMin?: number
	price?: number
	currency?: string
	color?: string
	description?: string
	staffPolicy?: StaffPolicy
	assignedPositions?: string[]
	assignedStaff?: string[]
}

export type { StaffPolicy, CreateEventTypeBody, UpdateEventTypeBody }
