'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
	getTodayStrInTz,
	startOfMonthInTz,
	startOfYearInTz,
} from '@/lib/calendar/utils'
import type {
	StatsFilters,
	StatsPreset,
	StatsScope,
} from '@/services/configs/stats.types'

const VALID_PRESETS: StatsPreset[] = [
	'today',
	'7d',
	'30d',
	'thisMonth',
	'thisYear',
	'custom',
]

const isStatsPreset = (value: string | null): value is StatsPreset =>
	value !== null && VALID_PRESETS.includes(value as StatsPreset)

const addDaysIso = (yyyyMmDd: string, days: number): string => {
	const date = new Date(`${yyyyMmDd}T00:00:00Z`)
	date.setUTCDate(date.getUTCDate() + days)
	return date.toISOString().slice(0, 10)
}

interface PresetRangeDeps {
	getToday: () => string
	getMonthStart: () => string
	getYearStart: () => string
}

const computePresetRangeWithDeps = (
	preset: StatsPreset,
	deps: PresetRangeDeps,
): { from: string; to: string } => {
	const today = deps.getToday()
	if (preset === 'today') return { from: today, to: today }
	if (preset === '7d') return { from: addDaysIso(today, -6), to: today }
	if (preset === '30d') return { from: addDaysIso(today, -29), to: today }
	if (preset === 'thisMonth') return { from: deps.getMonthStart(), to: today }
	if (preset === 'thisYear') return { from: deps.getYearStart(), to: today }
	return { from: today, to: today }
}

const computePresetRange = (
	preset: StatsPreset,
	timezone: string,
	getToday: () => string = () => getTodayStrInTz(timezone),
): { from: string; to: string } =>
	computePresetRangeWithDeps(preset, {
		getToday,
		getMonthStart: () => startOfMonthInTz(timezone),
		getYearStart: () => startOfYearInTz(timezone),
	})

const parseFiltersFromParams = (
	params: URLSearchParams,
	scope: StatsScope,
	timezone: string,
	getToday: () => string = () => getTodayStrInTz(timezone),
): StatsFilters => {
	const presetParam = params.get('preset')
	const preset: StatsPreset = isStatsPreset(presetParam) ? presetParam : '30d'
	const fromParam = params.get('from')
	const toParam = params.get('to')

	const baseRange =
		preset === 'custom' && fromParam && toParam
			? { from: fromParam, to: toParam }
			: computePresetRange(preset, timezone, getToday)

	const statusCsv = params.get('status')
	const statusIds =
		statusCsv && statusCsv.length > 0
			? statusCsv.split(',').filter(Boolean)
			: null

	const staffParam = params.get('staff')
	const staffId = scope === 'org-admin' && staffParam ? staffParam : null

	return { ...baseRange, statusIds, staffId, preset }
}

const serializeFiltersToParams = (
	filters: StatsFilters,
	scope: StatsScope,
): string => {
	const params = new URLSearchParams()
	params.set('from', filters.from)
	params.set('to', filters.to)
	if (filters.statusIds && filters.statusIds.length > 0) {
		params.set('status', filters.statusIds.join(','))
	}
	if (scope === 'org-admin' && filters.staffId) {
		params.set('staff', filters.staffId)
	}
	if (filters.preset !== '30d') {
		params.set('preset', filters.preset)
	}
	return params.toString()
}

const useStatsFilters = (scope: StatsScope, timezone: string) => {
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()

	const filters = parseFiltersFromParams(searchParams, scope, timezone)

	const setFilters = useCallback(
		(next: StatsFilters) => {
			const serialized = serializeFiltersToParams(next, scope)
			router.replace(`${pathname}?${serialized}`)
		},
		[router, pathname, scope],
	)

	return { filters, setFilters }
}

export {
	useStatsFilters,
	parseFiltersFromParams,
	serializeFiltersToParams,
	computePresetRange,
}
