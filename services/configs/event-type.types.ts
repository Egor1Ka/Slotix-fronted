import type { BaseFieldOverrides } from './booking-field.types'

type StaffPolicy = 'any' | 'by_position' | 'specific'

interface CreateEventTypeBody {
	orgId?: string
	userId?: string
	name: string
	durationMin: number
	price: number
	currency: string
	color?: string
	description?: string
	staffPolicy?: StaffPolicy
	assignedPositions?: string[]
	assignedStaff?: string[]
	baseFieldOverrides?: BaseFieldOverrides
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
	baseFieldOverrides?: BaseFieldOverrides
}

export type { StaffPolicy, CreateEventTypeBody, UpdateEventTypeBody }
