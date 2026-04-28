'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/stats/format'
import type { StatsKpi } from '@/services/configs/stats.types'

function KpiCards({ kpi, currency }: { kpi: StatsKpi; currency: string }) {
	const t = useTranslations('stats.kpi')
	const locale = useLocale()

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<Card data-slot="kpi-card-bookings">
				<CardHeader>
					<CardTitle className="text-muted-foreground text-sm font-medium">
						{t('bookings')}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-semibold tabular-nums">
						{kpi.bookingsCount}
					</div>
				</CardContent>
			</Card>
			<Card data-slot="kpi-card-revenue">
				<CardHeader>
					<CardTitle className="text-muted-foreground text-sm font-medium">
						{t('revenue')}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-semibold tabular-nums">
						{formatMoney(kpi.totalAmount, currency, locale)}
					</div>
				</CardContent>
			</Card>
			<Card data-slot="kpi-card-avg-ticket">
				<CardHeader>
					<CardTitle className="text-muted-foreground text-sm font-medium">
						{t('avgTicket')}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-semibold tabular-nums">
						{formatMoney(kpi.avgTicket, currency, locale)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export { KpiCards }
