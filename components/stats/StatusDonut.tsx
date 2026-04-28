'use client'

import { useTranslations } from 'next-intl'
import { Cell, Pie, PieChart } from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { translateStatusLabel } from '@/lib/stats/status-label'
import type { StatusSlice } from '@/services/configs/stats.types'

type Translator = (key: string) => string

const buildConfig = (
	slices: StatusSlice[],
	translate: Translator,
): ChartConfig =>
	slices.reduce<ChartConfig>((acc, slice) => {
		acc[slice.statusId] = {
			label: translateStatusLabel(slice.label, translate),
			color: slice.color,
		}
		return acc
	}, {})

function StatusDonut({ data }: { data: StatusSlice[] }) {
	const t = useTranslations('stats.charts')
	const tBooking = useTranslations('booking')

	if (data.length === 0) return null

	const config = buildConfig(data, tBooking)
	const localizedData = data.map((slice) => ({
		...slice,
		label: translateStatusLabel(slice.label, tBooking),
	}))

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t('byStatus')}</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={config} className="h-72 w-full">
					<PieChart>
						<ChartTooltip content={<ChartTooltipContent />} />
						<Pie
							data={localizedData}
							dataKey="bookingsCount"
							nameKey="label"
							innerRadius={60}
							outerRadius={100}
							paddingAngle={2}
						>
							{localizedData.map((slice) => (
								<Cell key={slice.statusId} fill={slice.color} />
							))}
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}

export { StatusDonut }
