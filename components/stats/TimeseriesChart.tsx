'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateLabel, formatMoneyCompact } from '@/lib/stats/format'
import type {
	Granularity,
	TimeseriesPoint,
} from '@/services/configs/stats.types'

type Metric = 'count' | 'revenue'

interface TimeseriesChartProps {
	data: TimeseriesPoint[]
	metric: Metric
	granularity: Granularity
	timezone: string
	currency: string
}

function TimeseriesChart({
	data,
	metric,
	granularity,
	timezone,
	currency,
}: TimeseriesChartProps) {
	const t = useTranslations('stats.charts')
	const locale = useLocale()

	const dataKey = metric === 'count' ? 'bookingsCount' : 'totalAmount'
	const titleKey =
		metric === 'count' ? 'timeseriesCount' : 'timeseriesRevenue'
	const seriesLabel = t(metric === 'count' ? 'bookingsCount' : 'revenue')
	const config: ChartConfig = {
		[dataKey]: {
			label: seriesLabel,
			color: metric === 'count' ? 'var(--chart-1)' : 'var(--chart-2)',
		},
	}

	const formatX = (date: string): string =>
		formatDateLabel(date, granularity, timezone, locale)
	const formatY = (value: number): string =>
		metric === 'revenue'
			? formatMoneyCompact(value, currency, locale)
			: String(value)

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t(titleKey)}</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={config} className="h-72 w-full">
					<AreaChart data={data}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickFormatter={formatX}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickFormatter={formatY}
						/>
						<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
						<Area
							type="monotone"
							dataKey={dataKey}
							stroke={`var(--color-${dataKey})`}
							fill={`var(--color-${dataKey})`}
							fillOpacity={0.2}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}

export { TimeseriesChart }
