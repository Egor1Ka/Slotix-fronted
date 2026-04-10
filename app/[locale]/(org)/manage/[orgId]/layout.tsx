import { redirect } from 'next/navigation'
import { checkOrgAccess } from '@/lib/auth/check-org-access'

const ADMIN_ROLES = ['owner', 'admin']

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

	return <>{children}</>
}
