// ── Org ──

interface OrgListItem {
	id: string
	name: string
	logo: string | null
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
	active: boolean
}

interface CreateOrgBody {
	name: string
	currency: 'UAH' | 'USD'
	logoUrl?: string
	brandColor?: string
	timezone?: string
	defaultCountry?: string
	description?: string
	address?: string
	phone?: string
	website?: string
}

interface UpdateOrgBody {
	name?: string
	description?: string | null
	address?: string | null
	phone?: string | null
	website?: string | null
	logoUrl?: string | null
	brandColor?: string | null
	timezone?: string
}

interface AddStaffBody {
	userId: string
}

interface OrgMembership {
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
	displayName: string | null
	bio: string | null
	positionId: string | null
	position: string | null
}

export type {
	OrgListItem,
	CreateOrgBody,
	UpdateOrgBody,
	AddStaffBody,
	OrgMembership,
}
