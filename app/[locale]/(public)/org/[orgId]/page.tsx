import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_PUBLIC_CONFIG } from '@/lib/calendar/view-config'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'
import { OrgDeactivatedBanner } from '@/components/organizations/OrgDeactivatedBanner'

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
		// Если запрос не удался, пропускаем проверку — календарь обработает ошибки сам
		return true
	}
}

export default async function OrgPublicPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params
	const t = await getTranslations('booking')

	const orgActive = await fetchOrgActive(orgId)

	if (!orgActive) {
		return <OrgDeactivatedBanner variant="public" />
	}

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={ORG_PUBLIC_CONFIG}>
				<OrgCalendarPage orgSlug={orgId} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
