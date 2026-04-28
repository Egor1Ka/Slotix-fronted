type Granularity = 'day' | 'week' | 'month'
type StatsScope = 'personal' | 'org-admin' | 'org-self'

interface StatsKpi {
	bookingsCount: number
	totalAmount: number
	avgTicket: number
}

interface TimeseriesPoint {
	date: string
	bookingsCount: number
	totalAmount: number
}

interface StatusSlice {
	statusId: string
	label: string
	color: string
	bookingsCount: number
	totalAmount: number
}

interface TopServiceItem {
	eventTypeId: string
	name: string
	bookingsCount: number
	totalAmount: number
}

interface TopStaffItem {
	staffId: string
	name: string
	avatar: string
	bookingsCount: number
	totalAmount: number
}

interface StatsResponse {
	currency: string
	timezone: string
	granularity: Granularity
	kpi: StatsKpi
	timeseries: TimeseriesPoint[]
	byStatus: StatusSlice[]
	topServices: TopServiceItem[]
	topStaff?: TopStaffItem[]
}

type StatsPreset = 'today' | '7d' | '30d' | 'thisMonth' | 'thisYear' | 'custom'

interface StatsFilters {
	from: string
	to: string
	statusIds: string[] | null
	staffId: string | null
	preset: StatsPreset
}

export type {
	Granularity,
	StatsScope,
	StatsKpi,
	TimeseriesPoint,
	StatusSlice,
	TopServiceItem,
	TopStaffItem,
	StatsResponse,
	StatsFilters,
	StatsPreset,
}
