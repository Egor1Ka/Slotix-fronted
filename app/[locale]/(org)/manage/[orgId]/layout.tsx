import { redirect } from 'next/navigation'
import { checkOrgAccess } from '@/lib/auth/check-org-access'
import { OrgDeactivatedBanner } from '@/components/organizations/OrgDeactivatedBanner'

const ADMIN_ROLES = ['owner', 'admin']

async function fetchOrgActive(orgId: string): Promise<boolean> {
	const backendUrl = process.env.BACKEND_URL ?? ''

	try {
		const response = await fetch(`${backendUrl}/api/org/${orgId}`, {
			cache: 'no-store',
		})

		if (!response.ok) return true

		const json = await response.json()
		return json.data.active !== false
	} catch {
		// Если запрос не удался, пропускаем проверку — дочерние компоненты обработают ошибки
		return true
	}
}

export default async function ManageOrgLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode
	params: Promise<{ orgId: string; locale: string }>
}>) {
	const { orgId, locale } = await params
	const membership = await checkOrgAccess(orgId)

	if (!membership || membership.status !== 'active' || !ADMIN_ROLES.includes(membership.role)) {
		redirect(`/${locale}/forbidden`)
	}

	const orgActive = await fetchOrgActive(orgId)

	if (!orgActive) {
		const variant = membership.role === 'owner' ? 'owner' : 'member'
		return <OrgDeactivatedBanner variant={variant} />
	}

	return <>{children}</>
}
