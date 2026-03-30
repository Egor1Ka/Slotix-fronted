interface Position {
	id: string
	name: string
	level: number
	color: string | null
	active: boolean
	staffCount: number
	createdAt: string
	updatedAt: string
}

interface CreatePositionBody {
	orgId: string
	name: string
	level?: number
	color?: string
}

interface UpdatePositionBody {
	name?: string
	level?: number
	color?: string
}

export type { Position, CreatePositionBody, UpdatePositionBody }
