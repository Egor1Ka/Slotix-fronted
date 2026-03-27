'use client'

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { STAFF_SELF_CONFIG } from '@/lib/calendar/view-config'
import { BookingPage } from '@/app/[locale]/book/[staffSlug]/BookingPage'
import { useUser } from '@/lib/auth/user-provider'

export default function PersonalSchedulePage() {
	const user = useUser()
	const t = useTranslations('booking')

	return (
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
	)
}
