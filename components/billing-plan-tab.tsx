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

// ── Подписочные планы ───────────────────────────────────────────────────────
// UI-конфиг для подписочных планов.
// "productId" — ID продукта из дашборда платёжки (Creem, Stripe и т.д.).
//               Для бесплатного плана — null (чекаут не нужен).
//
// Чтобы добавить новый подписочный план:
//   1. Создай recurring-продукт в дашборде платёжки
//   2. Добавь ключ плана в PLAN_HIERARCHY (порядок: слабый → сильный)
//   3. Добавь запись ниже с ID продукта из платёжки
//   4. На бэкенде тоже добавь: SUBSCRIPTION_PRODUCTS + PLANS в constants/billing.js

const PLAN_HIERARCHY = ['free', 'pro']

const PLAN_DETAILS = {
	free: {
		name: 'Free',
		price: '$0',
		period: '/month',
		features: ['Up to 3 projects', 'Dashboard access', 'Community support'],
		productId: null, // бесплатный план — чекаут не нужен
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
		productId: 'prod_TkVdhx4EhreepQ0TwmrrL', // ID продукта из платёжки для подписки Pro
	},
} as const

// ── Одноразовые продукты ────────────────────────────────────────────────────
// UI-конфиг для одноразовых покупок (аддоны).
// Дают фичи/лимиты поверх подписочного плана пользователя.
// Ключ должен совпадать с ключом продукта на бэкенде (значение в ONE_TIME_PRODUCTS в constants/billing.js).
// "productId" — ID продукта из дашборда платёжки (Creem, Stripe и т.д.).
//
// Чтобы добавить новый одноразовый продукт:
//   1. Создай one-time продукт в дашборде платёжки
//   2. Добавь запись ниже: название, цена, список фич, ID продукта из платёжки
//   3. На бэкенде тоже добавь: ONE_TIME_PRODUCTS + PRODUCTS в constants/billing.js
//
// Купленные продукты автоматически скрываются (фильтруются по plan.products из API).

const PRODUCT_DETAILS = {
	// ключ = внутренний ключ продукта (совпадает с Order.productKey на бэкенде)
	export_pack: {
		name: 'Starter Pack',                          // название для UI
		price: '$9',                                    // цена для отображения
		features: ['Export data', '5000 MB storage'],   // список фич на карточке
		productId: 'prod_4tHvpNEWtUFrf8LaGBqyh8',      // ID продукта из платёжки для чекаута
	},
} as const

// ── Helpers ─────────────────────────────────────────────────────────────────

const getProductDisplayName = (productKey: string) => {
	const details = PRODUCT_DETAILS[productKey as keyof typeof PRODUCT_DETAILS]
	return details ? details.name : productKey
}

const isProductPurchased = (products: string[], productKey: string) =>
	products.includes(productKey)

const getAvailableProducts = (purchasedProducts: string[]) =>
	Object.entries(PRODUCT_DETAILS).filter(
		([key]) => !isProductPurchased(purchasedProducts, key),
	)

// ── Component ───────────────────────────────────────────────────────────────

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
	const availableProducts = getAvailableProducts(plan.products)
	const hasPurchasedProducts = plan.products.length > 0

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
								{subscription.status.replace('_', ' ')}
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground flex gap-6 text-sm">
						<span>
							Projects:{' '}
							{plan.limits.projects === Infinity
								? '∞'
								: plan.limits.projects}
						</span>
						<span>Storage: {plan.limits.storage} MB</span>
					</div>
					{hasPurchasedProducts && (
						<div className="text-muted-foreground mt-2 text-sm">
							Products: {plan.products.map(getProductDisplayName).join(', ')}
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
					{PLAN_HIERARCHY.map((key, index) => {
						const details =
							PLAN_DETAILS[key as keyof typeof PLAN_DETAILS]
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
										<CreemCheckout
											productId={details.productId}
											checkoutPath="/api/checkout"
										>
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

			{/* ── Products ───────────────────────────────────────────── */}
			{availableProducts.length > 0 && (
				<div>
					<h3 className="mb-4 text-lg font-semibold">Products</h3>
					<div className="grid gap-6 lg:grid-cols-2">
						{availableProducts.map(([key, details]) => (
							<Card key={key}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>{details.name}</CardTitle>
										<Badge variant="secondary">One-time</Badge>
									</div>
									<div className="flex items-baseline gap-1">
										<span className="text-3xl font-semibold">
											{details.price}
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
									<CreemCheckout
										productId={details.productId}
										checkoutPath="/api/checkout"
									>
										<Button className="w-full">
											Buy {details.name}
										</Button>
									</CreemCheckout>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
