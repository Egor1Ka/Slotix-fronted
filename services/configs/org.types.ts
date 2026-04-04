// ── Org ──

interface OrgListItem {
	id: string
	name: string
	logo: string | null
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
}

interface CreateOrgBody {
	name: string
	currency: 'UAH' | 'USD'
	logoUrl?: string
	brandColor?: string
	defaultTimezone?: string
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
}

interface AddStaffBody {
	userId: string
}

export type { OrgListItem, CreateOrgBody, UpdateOrgBody, AddStaffBody }
