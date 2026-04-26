import { describe, it, expect } from 'vitest'
import {
	formatAmount,
	formatPeriod,
	formatDate,
	getEffectiveCancelDate,
	getEventLabelKey,
	canCancelSubscription,
} from './format'

describe('formatAmount', () => {
	it('renders cents as USD with two decimals', () => {
		expect(formatAmount(499, 'USD')).toBe('$4.99')
	})

	it('renders zero amount', () => {
		expect(formatAmount(0, 'USD')).toBe('$0.00')
	})

	it('uses currency code prefix when not USD', () => {
		expect(formatAmount(1200, 'UAH')).toBe('UAH 12.00')
	})
})

describe('formatPeriod', () => {
	it('formats start–end as DD.MM.YYYY — DD.MM.YYYY', () => {
		const start = '2026-04-01T00:00:00Z'
		const end = '2026-05-01T00:00:00Z'
		const result = formatPeriod(start, end, 'en-CA')
		expect(result).toBe('2026-04-01 — 2026-05-01')
	})

	it('returns null when either date missing', () => {
		expect(formatPeriod(null, '2026-05-01T00:00:00Z', 'en-CA')).toBeNull()
		expect(formatPeriod('2026-04-01T00:00:00Z', null, 'en-CA')).toBeNull()
	})
})

describe('formatDate', () => {
	it('formats ISO string in given locale', () => {
		const result = formatDate('2026-04-26T10:00:00Z', 'en-CA')
		expect(result).toBe('2026-04-26')
	})
})

describe('getEffectiveCancelDate', () => {
	it('returns cancelAt when present', () => {
		const sub = { cancelAt: '2026-05-01T00:00:00Z', currentPeriodEnd: '2026-05-15T00:00:00Z' }
		expect(getEffectiveCancelDate(sub)).toBe('2026-05-01T00:00:00Z')
	})

	it('falls back to currentPeriodEnd when cancelAt is null', () => {
		const sub = { cancelAt: null, currentPeriodEnd: '2026-05-15T00:00:00Z' }
		expect(getEffectiveCancelDate(sub)).toBe('2026-05-15T00:00:00Z')
	})

	it('returns null when both are missing', () => {
		const sub = { cancelAt: null, currentPeriodEnd: '' }
		expect(getEffectiveCancelDate(sub)).toBeNull()
	})
})

describe('getEventLabelKey', () => {
	it('maps known events to camelCase keys', () => {
		expect(getEventLabelKey('checkout.completed')).toBe('checkoutCompleted')
		expect(getEventLabelKey('subscription.paid')).toBe('subscriptionPaid')
		expect(getEventLabelKey('refund.created')).toBe('refundCreated')
		expect(getEventLabelKey('dispute.created')).toBe('disputeCreated')
	})

	it('returns "unknown" for anything else', () => {
		expect(getEventLabelKey('subscription.paused')).toBe('unknown')
		expect(getEventLabelKey('')).toBe('unknown')
	})
})

describe('canCancelSubscription', () => {
	it('returns true only for active status', () => {
		expect(canCancelSubscription({ status: 'active' })).toBe(true)
		expect(canCancelSubscription({ status: 'scheduled_cancel' })).toBe(false)
		expect(canCancelSubscription({ status: 'canceled' })).toBe(false)
		expect(canCancelSubscription({ status: 'past_due' })).toBe(false)
		expect(canCancelSubscription({ status: 'paused' })).toBe(false)
		expect(canCancelSubscription({ status: 'expired' })).toBe(false)
	})

	it('returns false when subscription is null', () => {
		expect(canCancelSubscription(null)).toBe(false)
	})
})
