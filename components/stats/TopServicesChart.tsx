'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoneyCompact } from '@/lib/stats/format'
import type { TopServiceItem } from '@/services/configs/stats.types'

type Metric = 'count' | 'revenue'

interface TopServicesChartProps {
	data: TopServiceItem[]
	metric: Metric
	currency: string
}

const buildConfig = (metric: Metric, label: string): ChartConfig => ({
	[metric === 'count' ? 'bookingsCount' : 'totalAmount']: {
		label,
		color: metric === 'count' ? 'var(--chart-1)' : 'var(--chart-2)',
	},
})

function TopServicesChart({ data, metric, currency }: TopServicesChartProps) {
	const t = useTranslations('stats.charts')
	const locale = useLocale()

	if (data.length === 0) return null

	const dataKey = metric === 'count' ? 'bookingsCount' : 'totalAmount'
	const titleKey = metric === 'count' ? 'topServicesByCount' : 'topServicesByRevenue'
	const config = buildConfig(metric, t(metric === 'count' ? 'bookingsCount' : 'revenue'))
	const formatX = (value: number): string =>
		metric === 'revenue' ? formatMoneyCompact(value, currency, locale) : String(value)

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t(titleKey)}</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={config} className="h-72 w-full">
					<BarChart data={data} layout="vertical">
						<CartesianGrid horizontal={false} />
						<XAxis
							type="number"
							tickLine={false}
							axisLine={false}
							tickFormatter={formatX}
						/>
						<YAxis
							dataKey="name"
							type="category"
							tickLine={false}
							axisLine={false}
							width={140}
						/>
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar
							dataKey={dataKey}
							fill={`var(--color-${dataKey})`}
							radius={4}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}

export { TopServicesChart }
