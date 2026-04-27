import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_PUBLIC_CONFIG } from '@/lib/calendar/view-config'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'
import { buildOgMetadata } from '@/lib/seo/og-metadata'

async function fetchOrgAndStaffForMeta(orgId: string, staffId: string) {
	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const [orgResponse, staffResponse] = await Promise.all([
			fetch(`${backendUrl}/api/org/${orgId}`, {
				cache: 'force-cache',
				next: { revalidate: 60 },
			}),
			fetch(`${backendUrl}/api/staff/${staffId}?orgId=${orgId}`, {
				cache: 'force-cache',
				next: { revalidate: 60 },
			}),
		])
		if (!orgResponse.ok || !staffResponse.ok) return null
		const orgJson = await orgResponse.json()
		const staffJson = await staffResponse.json()
		return {
			org: orgJson.data as { name: string; description: string | null },
			staff: staffJson.data as {
				name: string
				bio: string | null
				ogImage: string | null
			},
		}
	} catch {
		return null
	}
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; orgId: string; staffId: string }>
}): Promise<Metadata> {
	const { locale, orgId, staffId } = await params
	const data = await fetchOrgAndStaffForMeta(orgId, staffId)
	if (!data) return {}
	return buildOgMetadata({
		title: `${data.staff.name} · ${data.org.name}`,
		description: data.staff.bio ?? data.org.description ?? '',
		image: data.staff.ogImage,
		locale,
	})
}

export default async function OrgStaffPublicPage({
	params,
}: {
	params: Promise<{ orgId: string; staffId: string }>
}) {
	const { orgId, staffId } = await params
	const t = await getTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={ORG_PUBLIC_CONFIG}>
				<OrgCalendarPage orgSlug={orgId} staffId={staffId} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
