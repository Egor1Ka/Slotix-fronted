import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_ADMIN_CONFIG } from '@/lib/calendar/view-config'
import { BookingLayout } from '@/components/booking/BookingLayout'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'

export default async function OrgAdminStaffPage({
	params,
}: {
	params: Promise<{ orgSlug: string; staffId: string }>
}) {
	const { orgSlug, staffId } = await params
	const t = await getTranslations('booking')

	return (
		<BookingLayout>
			<Suspense
				fallback={
					<div className="flex min-h-screen items-center justify-center">
						<p className="text-muted-foreground">{t('loading')}</p>
					</div>
				}
			>
				<CalendarViewConfigProvider config={ORG_ADMIN_CONFIG}>
					<OrgCalendarPage orgSlug={orgSlug} staffId={staffId} />
				</CalendarViewConfigProvider>
			</Suspense>
		</BookingLayout>
	)
}
