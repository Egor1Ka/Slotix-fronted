import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getUser } from '@/lib/auth/get-user'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { STAFF_SELF_CONFIG } from '@/lib/calendar/view-config'
import { BookingLayout } from '@/components/booking/BookingLayout'
import { BookingPage } from '../../book/[staffSlug]/BookingPage'

export default async function StaffSelfPage() {
	const user = await getUser()
	if (!user) redirect('/login')

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
				<CalendarViewConfigProvider config={STAFF_SELF_CONFIG}>
					<BookingPage staffSlug={user.id} />
				</CalendarViewConfigProvider>
			</Suspense>
		</BookingLayout>
	)
}
