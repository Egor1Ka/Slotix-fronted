import { redirect } from 'next/navigation'
import { checkOrgAccess } from '@/lib/auth/check-org-access'

export default async function OrgMemberLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode
	params: Promise<{ orgId: string; locale: string }>
}>) {
	const { orgId, locale } = await params
	const membership = await checkOrgAccess(orgId)

	if (!membership || membership.status !== 'active') {
		redirect(`/${locale}/forbidden`)
	}

	return <>{children}</>
}
