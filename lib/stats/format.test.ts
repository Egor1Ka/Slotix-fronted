import { describe, it, expect } from 'vitest'
import { formatMoney, formatDateLabel } from './format'

describe('formatMoney', () => {
	it('formats UAH amount with the EN locale', () => {
		expect(formatMoney(1500, 'UAH', 'en')).toMatch(/1,500/)
	})
	it('formats USD amount with the UK locale', () => {
		expect(formatMoney(999, 'USD', 'uk')).toMatch(/999/)
	})
	it('returns 0 of the right currency for 0', () => {
		expect(formatMoney(0, 'UAH', 'en')).toMatch(/0/)
	})
})

describe('formatDateLabel', () => {
	it('day granularity → contains "Apr" for 2026-04-05', () => {
		expect(formatDateLabel('2026-04-05', 'day', 'Europe/Kyiv', 'en')).toMatch(/Apr/)
	})
	it('month granularity → contains "April" for first of month', () => {
		expect(formatDateLabel('2026-04-01', 'month', 'Europe/Kyiv', 'en')).toMatch(/April/)
	})
	it('week granularity → range with both endpoints', () => {
		const out = formatDateLabel('2026-04-13', 'week', 'Europe/Kyiv', 'en')
		expect(out).toMatch(/13/)
		expect(out).toMatch(/19/)
	})
})
