import { describe, it, expect } from 'vitest'
import { wallClockInTz } from './tz'

describe('wallClockInTz', () => {
  it('returns Kyiv wall-clock for UTC iso in DST', () => {
    const wc = wallClockInTz('2026-04-18T06:00:00Z', 'Europe/Kyiv')
    expect(wc).toEqual({ year: 2026, month: 4, day: 18, hour: 9, minute: 0, dayOfWeek: 6 })
  })
  it('returns Berlin wall-clock for same iso', () => {
    const wc = wallClockInTz('2026-04-18T06:00:00Z', 'Europe/Berlin')
    expect(wc.hour).toBe(8)
  })
  it('handles midnight wraparound (date changes across tz)', () => {
    const wc = wallClockInTz('2026-04-18T23:30:00Z', 'Europe/Kyiv')
    expect(wc).toMatchObject({ day: 19, hour: 2, minute: 30 })
  })
  it('dayOfWeek: Sunday is 0, Saturday is 6', () => {
    const sunday = wallClockInTz('2026-04-19T12:00:00Z', 'Europe/Kyiv')
    expect(sunday.dayOfWeek).toBe(0)
  })
})
