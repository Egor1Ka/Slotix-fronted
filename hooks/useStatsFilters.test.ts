import { describe, it, expect } from 'vitest'
import {
	parseFiltersFromParams,
	serializeFiltersToParams,
	computePresetRange,
} from './useStatsFilters'

const params = (s: string) => new URLSearchParams(s)

describe('parseFiltersFromParams', () => {
	it('returns the 30d default when URL is empty', () => {
		const out = parseFiltersFromParams(
			params(''),
			'personal',
			'UTC',
			() => '2026-04-30',
		)
		expect(out.preset).toBe('30d')
		expect(out.from).toBe('2026-04-01')
		expect(out.to).toBe('2026-04-30')
		expect(out.statusIds).toBeNull()
		expect(out.staffId).toBeNull()
	})

	it('parses explicit range and statuses CSV', () => {
		const out = parseFiltersFromParams(
			params('from=2026-04-01&to=2026-04-15&status=a,b&preset=custom'),
			'personal',
			'UTC',
			() => '2026-04-30',
		)
		expect(out.from).toBe('2026-04-01')
		expect(out.to).toBe('2026-04-15')
		expect(out.statusIds).toEqual(['a', 'b'])
		expect(out.preset).toBe('custom')
	})

	it('reads staffId only for org-admin scope', () => {
		const out = parseFiltersFromParams(
			params('staff=stid_1'),
			'org-admin',
			'UTC',
			() => '2026-04-30',
		)
		expect(out.staffId).toBe('stid_1')
	})

	it('ignores staffId for personal scope', () => {
		const out = parseFiltersFromParams(
			params('staff=stid_1'),
			'personal',
			'UTC',
			() => '2026-04-30',
		)
		expect(out.staffId).toBeNull()
	})
})

describe('serializeFiltersToParams', () => {
	it('round-trips with parseFiltersFromParams', () => {
		const filters = {
			from: '2026-04-01',
			to: '2026-04-15',
			statusIds: ['a', 'b'],
			staffId: 'stid_1',
			preset: 'custom' as const,
		}
		const serialized = serializeFiltersToParams(filters, 'org-admin')
		const parsed = parseFiltersFromParams(
			new URLSearchParams(serialized),
			'org-admin',
			'UTC',
			() => '2026-04-30',
		)
		expect(parsed.from).toBe(filters.from)
		expect(parsed.to).toBe(filters.to)
		expect(parsed.statusIds).toEqual(filters.statusIds)
		expect(parsed.staffId).toBe(filters.staffId)
		expect(parsed.preset).toBe(filters.preset)
	})

	it('omits status when null (canonical default URL stays clean)', () => {
		const out = serializeFiltersToParams(
			{
				from: '2026-04-01',
				to: '2026-04-30',
				statusIds: null,
				staffId: null,
				preset: '30d',
			},
			'personal',
		)
		expect(out).not.toContain('status=')
	})
})

describe('computePresetRange', () => {
	it('30d → today − 29 to today', () => {
		const r = computePresetRange('30d', 'UTC', () => '2026-04-30')
		expect(r.from).toBe('2026-04-01')
		expect(r.to).toBe('2026-04-30')
	})
	it('today → today to today', () => {
		const r = computePresetRange('today', 'UTC', () => '2026-04-30')
		expect(r.from).toBe('2026-04-30')
		expect(r.to).toBe('2026-04-30')
	})
})
