'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { billingApi } from '@/services'
import type {
	BillingSubscription,
	BillingPayment,
	CatalogPlan,
} from '@/services/configs/billing.config'
import { PlanCard } from './PlanCard'
import { PaymentsTable } from './PaymentsTable'
import { ScheduledCancelBanner } from './ScheduledCancelBanner'
import { getEffectiveCancelDate } from '@/lib/billing/format'

const UPGRADE_HREF = '/#pricing'

interface BillingState {
	subscription: BillingSubscription | null
	payments: BillingPayment[]
	catalog: CatalogPlan[]
	loading: boolean
	error: boolean
}

const INITIAL_STATE: BillingState = {
	subscription: null,
	payments: [],
	catalog: [],
	loading: true,
	error: false,
}

function BillingPage() {
	const t = useTranslations('billing.page')
	const [state, setState] = useState<BillingState>(INITIAL_STATE)

	const upgradeHref = UPGRADE_HREF

	const loadAll = useCallback(async () => {
		setState((prev) => ({ ...prev, loading: true, error: false }))
		try {
			const [subRes, paymentsRes, catalogRes] = await Promise.all([
				billingApi.subscription(),
				billingApi.payments(),
				billingApi.catalog(),
			])
			setState({
				subscription: subRes.data,
				payments: paymentsRes.data,
				catalog: catalogRes.data.plans,
				loading: false,
				error: false,
			})
		} catch {
			setState((prev) => ({ ...prev, loading: false, error: true }))
		}
	}, [])

	useEffect(() => {
		const init = async () => {
			await loadAll()
		}
		init()
	}, [loadAll])

	const handleCancelled = () => {
		loadAll()
	}

	if (state.loading) {
		return (
			<main className="container mx-auto max-w-4xl px-4 py-8">
				<div className="flex items-center justify-center py-20">
					<Spinner />
				</div>
			</main>
		)
	}

	if (state.error) {
		return (
			<main className="container mx-auto max-w-4xl px-4 py-8">
				<div className="bg-card flex flex-col items-center gap-4 rounded-xl border p-8 text-center shadow-sm">
					<p className="text-muted-foreground">{t('loadError')}</p>
					<Button onClick={loadAll}>{t('retry')}</Button>
				</div>
			</main>
		)
	}

	const cancelDate = state.subscription
		? getEffectiveCancelDate(state.subscription)
		: null
	const showBanner =
		state.subscription?.status === 'scheduled_cancel' && cancelDate

	return (
		<main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
			<header className="space-y-1">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<p className="text-muted-foreground">{t('subtitle')}</p>
			</header>

			{showBanner && cancelDate && (
				<ScheduledCancelBanner cancelDate={cancelDate} />
			)}

			<PlanCard
				subscription={state.subscription}
				catalog={state.catalog}
				upgradeHref={upgradeHref}
				onCancelled={handleCancelled}
			/>

			<section className="space-y-3">
				<h2 className="text-xl font-semibold">{t('paymentsHistoryTitle')}</h2>
				<PaymentsTable payments={state.payments} loading={state.loading} />
			</section>
		</main>
	)
}

export { BillingPage }
