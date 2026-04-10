'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BillingCatalog, BillingSubscription, Plan } from '@/services'
import { billingApi } from '@/services'
import { formatPrice } from '@/lib/billing'
import { CreemCheckout } from '@creem_io/nextjs'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

// ── Helpers ─────────────────────────────────────────────────────────────────

const hasI18nKeys = (
	t: ReturnType<typeof useTranslations>,
	prefix: string,
	key: string,
) => t.has(`${prefix}.${key}.name`)

// ── Component ───────────────────────────────────────────────────────────────

interface BillingPlanTabProps {
	plan: Plan
	subscription: BillingSubscription | null
	catalog: BillingCatalog
	onPlanChanged: () => void
}

export function BillingPlanTab({
	plan,
	subscription,
	catalog,
	onPlanChanged,
}: BillingPlanTabProps) {
	const [cancelling, setCancelling] = useState(false)
	const t = useTranslations('billing')

	const currentIndex = catalog.hierarchy.indexOf(plan.key)
	const handleCancel = async () => {
		setCancelling(true)
		try {
			await billingApi.cancel()
			toast.success('Subscription cancelled')
			onPlanChanged()
		} catch {
			// errors handled by toast interceptor
		} finally {
			setCancelling(false)
		}
	}

	return (
		<div className="space-y-6 pt-6">
			{/* ── Current Plan ────────────────────────────────────────── */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<CardTitle>Current Plan</CardTitle>
						<Badge variant="outline" className="capitalize">
							{plan.key}
						</Badge>
						{subscription && (
							<Badge
								variant={
									subscription.status === 'active' ? 'default' : 'secondary'
								}
								className="capitalize"
							>
								{subscription.status.replaceAll('_', ' ')}
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{plan.limits.organizations !== undefined && (
						<div className="text-muted-foreground text-sm">
							<span>
								Organizations:{' '}
								{plan.limits.organizations === Infinity
									? '∞'
									: plan.limits.organizations}
							</span>
						</div>
					)}
					{subscription &&
						subscription.status !== 'canceled' &&
						subscription.status !== 'expired' && (
							<div className="mt-4">
								<AlertDialog>
									<AlertDialogTrigger
										render={
											<Button
												variant="outline"
												size="sm"
												disabled={cancelling}
											/>
										}
									>
										{cancelling ? 'Cancelling...' : 'Cancel subscription'}
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
											<AlertDialogDescription>
												Your subscription will remain active until the end of
												the current billing period. After that, you will be
												downgraded to the Free plan.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Keep subscription</AlertDialogCancel>
											<AlertDialogAction onClick={handleCancel}>
												Yes, cancel
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						)}
				</CardContent>
			</Card>

			{/* ── Subscription Plans ──────────────────────────────────── */}
			<div>
				<h3 className="mb-4 text-lg font-semibold">Subscription Plans</h3>
				<div className="grid gap-6 lg:grid-cols-2">
					{catalog.hierarchy.map((key, index) => {
						if (!hasI18nKeys(t, 'plans', key)) {
							if (process.env.NODE_ENV === 'development') {
								console.warn(`Missing i18n keys for billing plan: ${key}`)
							}
							return null
						}

						const catalogPlan = catalog.plans.find((p) => p.key === key)
						if (!catalogPlan) return null

						const isCurrent = key === plan.key
						const isHigher = index > currentIndex
						const features: string[] = t.raw(`plans.${key}.features`)

						return (
							<Card
								key={key}
								className={isCurrent ? 'border-primary border-2' : ''}
							>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>{t(`plans.${key}.name`)}</CardTitle>
										{isCurrent && <Badge>Current</Badge>}
									</div>
									<div className="flex items-baseline gap-1">
										<span className="text-3xl font-semibold">
											{formatPrice(catalogPlan.price, catalogPlan.currency)}
										</span>
										<span className="text-muted-foreground text-sm">
											{t(`period.${catalogPlan.period}`)}
										</span>
									</div>
								</CardHeader>
								<CardContent>
									<ul className="mb-6 space-y-2">
										{features.map((feature) => (
											<li
												key={feature}
												className="flex items-center gap-2 text-sm"
											>
												<Check className="text-primary h-4 w-4 shrink-0" />
												{feature}
											</li>
										))}
									</ul>
									{isHigher && catalogPlan.productId && (
										<CreemCheckout
											productId={catalogPlan.productId}
											checkoutPath="/api/checkout"
										>
											<Button className="w-full">
												Upgrade to {t(`plans.${key}.name`)}
											</Button>
										</CreemCheckout>
									)}
								</CardContent>
							</Card>
						)
					})}
				</div>
			</div>

		</div>
	)
}
