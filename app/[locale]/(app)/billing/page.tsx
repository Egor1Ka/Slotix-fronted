'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { BillingPlanTab } from '@/components/billing-plan-tab'
import { BillingHistoryTab } from '@/components/billing-history-tab'
import { billingApi } from '@/services'
import type { Plan, BillingSubscription, BillingPayment } from '@/services'

export default function BillingPage() {
	const searchParams = useSearchParams()
	const [plan, setPlan] = useState<Plan | null>(null)
	const [subscription, setSubscription] = useState<BillingSubscription | null>(
		null,
	)
	const [payments, setPayments] = useState<BillingPayment[]>([])
	const [loading, setLoading] = useState(true)

	const fetchData = async () => {
		try {
			const [planRes, subRes, payRes] = await Promise.all([
				billingApi.plan(),
				billingApi.subscription(),
				billingApi.payments(),
			])
			setPlan(planRes.data)
			setSubscription(subRes.data)
			setPayments(payRes.data)
		} catch {
			// errors handled by toast interceptor
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchData()
	}, [])

	useEffect(() => {
		if (searchParams.get('checkout') === 'success') {
			toast.success('Payment successful')
			window.history.replaceState({}, '', '/billing')
		}
	}, [searchParams])

	if (loading) {
		return (
			<div className="mx-auto max-w-4xl space-y-6 p-6">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-10 w-48" />
				<div className="grid gap-6 lg:grid-cols-3">
					<Skeleton className="h-64" />
					<Skeleton className="h-64" />
					<Skeleton className="h-64" />
				</div>
			</div>
		)
	}

	if (!plan) {
		return (
			<div className="text-muted-foreground p-6 text-center">
				Failed to load billing data
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-4xl p-6">
			<h1 className="mb-6 text-2xl font-semibold">Billing</h1>
			<Tabs defaultValue="plan">
				<TabsList>
					<TabsTrigger value="plan">Plan</TabsTrigger>
					<TabsTrigger value="history">History</TabsTrigger>
				</TabsList>
				<TabsContent value="plan">
					<BillingPlanTab
						plan={plan}
						subscription={subscription}
						onPlanChanged={fetchData}
					/>
				</TabsContent>
				<TabsContent value="history">
					<BillingHistoryTab payments={payments} />
				</TabsContent>
			</Tabs>
		</div>
	)
}
