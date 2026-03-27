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
}

export type { OrgListItem, CreateOrgBody }
