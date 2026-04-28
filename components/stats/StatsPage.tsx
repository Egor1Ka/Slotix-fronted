'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { useStatsFilters } from '@/hooks/useStatsFilters'
import {
	ApiError,
	bookingStatusApi,
	orgApi,
	statsApi,
} from '@/services'
import type { BookingStatusObject, OrgStaffMember } from '@/services'
import type {
	StatsFilters as StatsFiltersValue,
	StatsResponse,
	StatsScope,
} from '@/services/configs/stats.types'
import { StatsFilters } from './StatsFilters'
import { StatsSkeleton } from './StatsSkeleton'
import { EmptyStatsState } from './EmptyStatsState'
import { KpiCards } from './KpiCards'
import { TimeseriesChart } from './TimeseriesChart'
import { StatusDonut } from './StatusDonut'
import { TopServicesChart } from './TopServicesChart'
import { TopStaffChart } from './TopStaffChart'

interface StatsPageProps {
	mode: StatsScope
	orgId?: string
	timezone: string
}

const fetchStats = async (
	mode: StatsScope,
	orgId: string | undefined,
	filters: StatsFiltersValue,
): Promise<StatsResponse> => {
	const statusCsv =
		filters.statusIds && filters.statusIds.length > 0
			? filters.statusIds.join(',')
			: ''
	if (mode === 'personal') {
		const r = await statsApi.personal({
			pathParams: {
				from: filters.from,
				to: filters.to,
				statusCsv,
			},
		})
		return r.data
	}
	if (mode === 'org-admin') {
		const r = await statsApi.org({
			pathParams: {
				orgId: orgId ?? '',
				from: filters.from,
				to: filters.to,
				statusCsv,
				staffId: filters.staffId ?? '',
			},
		})
		return r.data
	}
	const r = await statsApi.orgMe({
		pathParams: {
			orgId: orgId ?? '',
			from: filters.from,
			to: filters.to,
			statusCsv,
		},
	})
	return r.data
}

const buildExpandTo90 = (
	todayIso: string,
): { from: string; to: string } => {
	const d = new Date(`${todayIso}T00:00:00Z`)
	d.setUTCDate(d.getUTCDate() - 89)
	return { from: d.toISOString().slice(0, 10), to: todayIso }
}

const statusListScope = (mode: StatsScope) =>
	mode === 'personal' ? 'personal' : 'org'

function StatsPage({ mode, orgId, timezone }: StatsPageProps) {
	const t = useTranslations('stats')
	const { filters, setFilters } = useStatsFilters(mode, timezone)

	const [statuses, setStatuses] = useState<BookingStatusObject[] | null>(null)
	const [staff, setStaff] = useState<OrgStaffMember[] | null>(null)
	const [stats, setStats] = useState<StatsResponse | null>(null)
	const [pending, setPending] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const scope = statusListScope(mode)
		const params: Record<string, string> = { scope }
		if (orgId) params.orgId = orgId
		bookingStatusApi
			.list({ pathParams: params })
			.then((r) => setStatuses(r.data))
			.catch(() => setStatuses([]))
	}, [mode, orgId])

	useEffect(() => {
		if (mode !== 'org-admin' || !orgId) return
		orgApi
			.getStaff({ pathParams: { id: orgId } })
			.then((r) => setStaff(r.data))
			.catch(() => setStaff([]))
	}, [mode, orgId])

	useEffect(() => {
		setPending(true)
		setError(null)
		fetchStats(mode, orgId, filters)
			.then(setStats)
			.catch((err) => {
				if (err instanceof ApiError) setError(err.displayMessage)
				else setError(t('errors.generic'))
			})
			.finally(() => setPending(false))
	}, [
		mode,
		orgId,
		filters.from,
		filters.to,
		filters.statusIds?.join(','),
		filters.staffId,
		t,
	])

	if (!stats && pending) return <StatsSkeleton />

	const isEmpty = stats !== null && stats.kpi.bookingsCount === 0

	return (
		<div className="relative space-y-4 p-4 md:p-6">
			{statuses && (
				<StatsFilters
					scope={mode}
					timezone={timezone}
					statuses={statuses}
					staff={staff}
					filters={filters}
					onChange={setFilters}
				/>
			)}

			{isEmpty ? (
				<EmptyStatsState
					onExpandRange={() =>
						setFilters({
							...filters,
							...buildExpandTo90(filters.to),
							preset: 'custom',
						})
					}
				/>
			) : (
				stats && (
					<div
						className={
							pending
								? 'space-y-4 opacity-50 transition-opacity'
								: 'space-y-4 transition-opacity'
						}
					>
						<KpiCards kpi={stats.kpi} currency={stats.currency} />
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<TimeseriesChart
								data={stats.timeseries}
								metric="count"
								granularity={stats.granularity}
								timezone={stats.timezone}
								currency={stats.currency}
							/>
							<TimeseriesChart
								data={stats.timeseries}
								metric="revenue"
								granularity={stats.granularity}
								timezone={stats.timezone}
								currency={stats.currency}
							/>
						</div>
						<StatusDonut data={stats.byStatus} />
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<TopServicesChart
								data={stats.topServices}
								metric="count"
								currency={stats.currency}
							/>
							<TopServicesChart
								data={stats.topServices}
								metric="revenue"
								currency={stats.currency}
							/>
						</div>
						{mode === 'org-admin' && stats.topStaff && (
							<TopStaffChart data={stats.topStaff} />
						)}
					</div>
				)
			)}

			{pending && stats && (
				<div className="absolute right-2 top-2">
					<Spinner />
				</div>
			)}
			{error && <div className="text-destructive text-sm">{error}</div>}
		</div>
	)
}

export { StatsPage }
