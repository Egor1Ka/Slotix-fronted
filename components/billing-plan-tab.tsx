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
import type { BillingSubscription, Plan } from '@/services'
import { billingApi } from '@/services'
import { CreemCheckout } from '@creem_io/nextjs'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const PLAN_HIERARCHY = ['free', 'starter', 'pro']

const PLAN_DETAILS = {
	free: {
		name: 'Free',
		price: '$0',
		period: '/month',
		features: ['Up to 3 projects', 'Dashboard access', 'Community support'],
		productId: null,
	},
	starter: {
		name: 'Starter',
		price: '$9',
		period: '/month',
		features: [
			'Up to 20 projects',
			'Dashboard access',
			'Export data',
			'Email support',
		],
		productId: 'prod_4gn11BCxdyx0jtpYnNsur0',
	},
	pro: {
		name: 'Pro',
		price: '$29',
		period: '/month',
		features: [
			'Unlimited projects',
			'Dashboard access',
			'Export data',
			'API access',
			'Priority support',
		],
		productId: 'prod_pro_monthly',
	},
} as const

interface BillingPlanTabProps {
	plan: Plan
	subscription: BillingSubscription | null
	onPlanChanged: () => void
}

export function BillingPlanTab({
	plan,
	subscription,
	onPlanChanged,
}: BillingPlanTabProps) {
	const [cancelling, setCancelling] = useState(false)

	const currentIndex = PLAN_HIERARCHY.indexOf(plan.key)

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
								{subscription.status.replace('_', ' ')}
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground flex gap-6 text-sm">
						<span>Projects: {plan.limits.projects === Infinity ? '∞' : plan.limits.projects}</span>
						<span>Storage: {plan.limits.storage} MB</span>
					</div>
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

			<div className="grid gap-6 lg:grid-cols-3">
				{PLAN_HIERARCHY.map((key, index) => {
					const details = PLAN_DETAILS[key as keyof typeof PLAN_DETAILS]
					const isCurrent = key === plan.key
					const isHigher = index > currentIndex

					return (
						<Card
							key={key}
							className={isCurrent ? 'border-primary border-2' : ''}
						>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle>{details.name}</CardTitle>
									{isCurrent && <Badge>Current</Badge>}
								</div>
								<div className="flex items-baseline gap-1">
									<span className="text-3xl font-semibold">
										{details.price}
									</span>
									<span className="text-muted-foreground text-sm">
										{details.period}
									</span>
								</div>
							</CardHeader>
							<CardContent>
								<ul className="mb-6 space-y-2">
									{details.features.map((feature) => (
										<li
											key={feature}
											className="flex items-center gap-2 text-sm"
										>
											<Check className="text-primary h-4 w-4 shrink-0" />
											{feature}
										</li>
									))}
								</ul>
								{isHigher && details.productId && (
									<CreemCheckout productId={details.productId} checkoutPath="/api/checkout">
										<Button className="w-full">
											Upgrade to {details.name}
										</Button>
									</CreemCheckout>
								)}
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}
