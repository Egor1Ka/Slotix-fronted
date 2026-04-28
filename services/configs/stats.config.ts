import { getData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { StatsResponse } from './stats.types'
import type { ApiResponse } from './user.config'

const buildStatsQuery = (params: Record<string, string | number>): string => {
	const out = new URLSearchParams({
		from: String(params.from),
		to: String(params.to),
	})
	const statusCsv = params.statusCsv
	if (statusCsv && String(statusCsv).length > 0) {
		out.set('statusIds', String(statusCsv))
	}
	const staffId = params.staffId
	if (staffId) out.set('staffId', String(staffId))
	return out.toString()
}

const statsApiConfig = {
	personal: endpoint<void, ApiResponse<StatsResponse>>({
		url: (pathParams) => `/api/stats/personal?${buildStatsQuery(pathParams)}`,
		method: getData,
		defaultErrorMessage: 'Failed to load statistics',
	}),

	org: endpoint<void, ApiResponse<StatsResponse>>({
		url: (pathParams) =>
			`/api/stats/org/${pathParams.orgId}?${buildStatsQuery(pathParams)}`,
		method: getData,
		defaultErrorMessage: 'Failed to load statistics',
	}),

	orgMe: endpoint<void, ApiResponse<StatsResponse>>({
		url: (pathParams) =>
			`/api/stats/org/${pathParams.orgId}/me?${buildStatsQuery(pathParams)}`,
		method: getData,
		defaultErrorMessage: 'Failed to load statistics',
	}),
}

export default statsApiConfig
