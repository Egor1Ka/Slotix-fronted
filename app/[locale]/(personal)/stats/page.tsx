'use client'

import { useEffect, useState } from 'react'
import { StatsPage } from '@/components/stats/StatsPage'
import { StatsSkeleton } from '@/components/stats/StatsSkeleton'
import { userApi } from '@/services'

export default function PersonalStatsPage() {
	const [timezone, setTimezone] = useState<string | null>(null)

	useEffect(() => {
		userApi
			.me()
			.then((r) => setTimezone(r.data.timezone || 'UTC'))
			.catch(() => setTimezone('UTC'))
	}, [])

	if (!timezone) return <StatsSkeleton />
	return <StatsPage mode="personal" timezone={timezone} />
}
