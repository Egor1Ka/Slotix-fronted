'use client'

import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TopStaffItem } from '@/services/configs/stats.types'

const config: ChartConfig = {
	bookingsCount: { label: 'Bookings', color: 'var(--chart-3)' },
}

function TopStaffChart({ data }: { data: TopStaffItem[] }) {
	const t = useTranslations('stats.charts')

	if (data.length === 0) return null

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t('topStaff')}</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={config} className="h-72 w-full">
					<BarChart data={data} layout="vertical">
						<CartesianGrid horizontal={false} />
						<XAxis type="number" tickLine={false} axisLine={false} />
						<YAxis
							dataKey="name"
							type="category"
							tickLine={false}
							axisLine={false}
							width={140}
						/>
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar
							dataKey="bookingsCount"
							fill="var(--color-bookingsCount)"
							radius={4}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}

export { TopStaffChart }
