import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { STAFF_PUBLIC_CONFIG } from '@/lib/calendar/view-config'
import { BookingPage } from '@/app/[locale]/book/[staffSlug]/BookingPage'
import { buildOgMetadata } from '@/lib/seo/og-metadata'

async function fetchStaffForMeta(staffId: string) {
	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const response = await fetch(`${backendUrl}/api/staff/${staffId}`, {
			cache: 'force-cache',
			next: { revalidate: 60 },
		})
		if (!response.ok) return null
		const json = await response.json()
		return json.data as {
			name: string
			bio: string | null
			description: string | null
			ogImage: string | null
		}
	} catch {
		return null
	}
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; staffSlug: string }>
}): Promise<Metadata> {
	const { locale, staffSlug } = await params
	const staff = await fetchStaffForMeta(staffSlug)
	if (!staff) return {}
	return buildOgMetadata({
		title: staff.name,
		description: staff.bio ?? staff.description ?? '',
		image: staff.ogImage,
		locale,
	})
}

export default async function StaffPublicPage({
	params,
}: {
	params: Promise<{ staffSlug: string }>
}) {
	const { staffSlug } = await params
	const t = await getTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={STAFF_PUBLIC_CONFIG}>
				<BookingPage staffSlug={staffSlug} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
