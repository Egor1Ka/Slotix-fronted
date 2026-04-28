'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { StatsPage } from '@/components/stats/StatsPage'
import { StatsSkeleton } from '@/components/stats/StatsSkeleton'
import { orgApi } from '@/services'

export default function OrgStatsPage() {
	const params = useParams<{ orgId: string }>()
	const orgId = params.orgId
	const [timezone, setTimezone] = useState<string | null>(null)

	useEffect(() => {
		if (!orgId) return
		orgApi
			.getById({ pathParams: { id: orgId } })
			.then((r) => setTimezone(r.data.timezone || 'UTC'))
			.catch(() => setTimezone('UTC'))
	}, [orgId])

	if (!timezone) return <StatsSkeleton />
	return <StatsPage mode="org-admin" orgId={orgId} timezone={timezone} />
}
