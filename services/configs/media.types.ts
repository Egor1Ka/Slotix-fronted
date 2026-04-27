// services/configs/media.types.ts

type AssetType = 'user-avatar' | 'staff-avatar' | 'org-logo' | 'service-photo'

interface UploadConfig {
	accept: string[]
	maxSizeBytes: number
	minDimensions?: { width: number; height: number }
}

interface UploadAvatarResponse {
	avatar: string
}

interface StaffAvatarResponse {
	avatar: string
	displayName: string | null
	bio: string | null
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
	position: string | null
}

interface OrgLogoResponse {
	id: string
	name: string
	logo: string | null
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	active: boolean
	timezone?: string
}

interface ServicePhotoResponse {
	id: string
	name: string
	slug: string
	image: string
	durationMin: number
	price: { amount: number; currency: string } | null
	currency?: string
	color: string
	description: string | null
	staffPolicy: 'any' | 'by_position' | 'specific'
	assignedPositions: string[]
	assignedStaff: string[]
}

export type {
	AssetType,
	UploadConfig,
	UploadAvatarResponse,
	StaffAvatarResponse,
	OrgLogoResponse,
	ServicePhotoResponse,
}
