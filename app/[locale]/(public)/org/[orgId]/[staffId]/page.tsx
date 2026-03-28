import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_PUBLIC_CONFIG } from '@/lib/calendar/view-config'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'

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
