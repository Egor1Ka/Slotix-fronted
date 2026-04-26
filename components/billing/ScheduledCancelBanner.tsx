'use client'

import { useLocale, useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatDate } from '@/lib/billing/format'

interface ScheduledCancelBannerProps {
	cancelDate: string
}

function ScheduledCancelBanner({ cancelDate }: ScheduledCancelBannerProps) {
	const t = useTranslations('billing.page')
	const locale = useLocale()
	const formatted = formatDate(cancelDate, locale)

	return (
		<Alert className="border-yellow-500/50 bg-yellow-500/5 text-yellow-900 dark:text-yellow-100">
			<AlertTriangle className="size-4" />
			<AlertTitle>{t('bannerScheduledTitle')}</AlertTitle>
			<AlertDescription>
				{t('bannerScheduledDescription', { date: formatted })}
			</AlertDescription>
		</Alert>
	)
}

export { ScheduledCancelBanner }
