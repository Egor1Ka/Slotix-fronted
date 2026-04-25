type ShareUrlVariant = 'org' | 'staff' | 'personal'

interface BuildShareUrlInput {
	origin: string
	variant: ShareUrlVariant
	orgSlug?: string
	staffId?: string
}

const buildShareUrl = (input: BuildShareUrlInput): string => {
	const { origin, variant, orgSlug, staffId } = input
	if (variant === 'staff' && orgSlug && staffId) {
		return `${origin}/org/${orgSlug}/${staffId}`
	}
	if (variant === 'org' && orgSlug) {
		return `${origin}/org/${orgSlug}`
	}
	if (variant === 'personal' && staffId) {
		return `${origin}/profile/${staffId}`
	}
	return origin
}

export { buildShareUrl }
export type { ShareUrlVariant, BuildShareUrlInput }
