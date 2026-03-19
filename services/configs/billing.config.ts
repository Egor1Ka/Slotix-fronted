import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse } from './user.config'

interface Plan {
	key: 'free' | 'starter' | 'pro'
	features: { dashboard: boolean; export: boolean; apiAccess: boolean }
	limits: { projects: number; storage: number }
}

interface BillingSubscription {
	id: string
	userId: string
	creemSubscriptionId: string
	creemCustomerId: string
	productId: string
	planKey: string
	status: string
	currentPeriodStart: string
	currentPeriodEnd: string
	cancelAt: string | null
	createdAt: string
	updatedAt: string
}

interface BillingPayment {
	id: string
	userId: string | null
	creemSubscriptionId: string
	creemEventId: string
	productId: string
	type: 'subscription' | 'one_time'
	eventType: string
	amount: number
	currency: string
	createdAt: string
	updatedAt: string
}

const billingApiConfig = {
	plan: endpoint<void, ApiResponse<Plan>>({
		url: () => `/api/billing/plan`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch plan',
	}),

	subscription: endpoint<void, ApiResponse<BillingSubscription | null>>({
		url: () => `/api/billing/subscription`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch subscription',
	}),

	payments: endpoint<void, ApiResponse<BillingPayment[]>>({
		url: () => `/api/billing/payments`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch payments',
	}),

	cancel: endpoint<void, ApiResponse<BillingSubscription>>({
		url: () => `/api/billing/cancel`,
		method: postData,
		defaultErrorMessage: 'Failed to cancel subscription',
	}),
}

export default billingApiConfig
export type {
	Plan,
	BillingSubscription,
	BillingPayment,
}
