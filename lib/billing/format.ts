import type { BillingSubscription } from '@/services/configs/billing.config'

const EVENT_LABEL_MAP: Record<string, string> = {
	'checkout.completed': 'checkoutCompleted',
	'subscription.paid': 'subscriptionPaid',
	'refund.created': 'refundCreated',
	'dispute.created': 'disputeCreated',
}

const formatAmount = (amountCents: number, currency: string): string => {
	const value = (amountCents / 100).toFixed(2)
	if (currency === 'USD') return `$${value}`
	return `${currency} ${value}`
}

const formatDate = (iso: string, locale: string): string => {
	const formatter = new Intl.DateTimeFormat(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
	return formatter.format(new Date(iso))
}

const formatPeriod = (
	start: string | null,
	end: string | null,
	locale: string,
): string | null => {
	if (!start || !end) return null
	return `${formatDate(start, locale)} — ${formatDate(end, locale)}`
}

type CancelInput = Pick<BillingSubscription, 'cancelAt' | 'currentPeriodEnd'>

const getEffectiveCancelDate = (sub: CancelInput): string | null => {
	if (sub.cancelAt) return sub.cancelAt
	if (sub.currentPeriodEnd) return sub.currentPeriodEnd
	return null
}

const getEventLabelKey = (eventType: string): string =>
	EVENT_LABEL_MAP[eventType] ?? 'unknown'

const canCancelSubscription = (
	sub: Pick<BillingSubscription, 'status'> | null,
): boolean => {
	if (!sub) return false
	return sub.status === 'active'
}

export {
	formatAmount,
	formatDate,
	formatPeriod,
	getEffectiveCancelDate,
	getEventLabelKey,
	canCancelSubscription,
}
