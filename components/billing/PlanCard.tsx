'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
	canCancelSubscription,
	formatAmount,
	formatPeriod,
	getEffectiveCancelDate,
	formatDate,
} from '@/lib/billing/format'
import { CancelSubscriptionDialog } from './CancelSubscriptionDialog'
import type {
	BillingSubscription,
	CatalogPlan,
} from '@/services/configs/billing.config'

interface PlanCardProps {
	subscription: BillingSubscription | null
	catalog: CatalogPlan[]
	upgradeHref: string
	onCancelled: () => void
}

const STATUS_BADGE_VARIANT: Record<
	string,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	active: 'default',
	scheduled_cancel: 'outline',
	canceled: 'secondary',
	expired: 'secondary',
	past_due: 'destructive',
	paused: 'outline',
}

const STATUS_LABEL_KEY: Record<string, string> = {
	active: 'active',
	scheduled_cancel: 'scheduledCancel',
	canceled: 'canceled',
	expired: 'expired',
	past_due: 'pastDue',
	paused: 'paused',
}

const PLAN_LABEL_KEY: Record<string, string> = {
	free: 'plans.free.name',
	org_creator: 'plans.org_creator.name',
}

const findCatalogPlan = (
	catalog: CatalogPlan[],
	planKey: string,
): CatalogPlan | null => {
	const matchesPlanKey = (plan: CatalogPlan) => plan.key === planKey
	return catalog.find(matchesPlanKey) ?? null
}

function PlanCard({
	subscription,
	catalog,
	upgradeHref,
	onCancelled,
}: PlanCardProps) {
	const t = useTranslations('billing.page')
	const tBilling = useTranslations('billing')
	const tStatus = useTranslations('billing.status')
	const locale = useLocale()
	const [dialogOpen, setDialogOpen] = useState(false)

	const planKey = subscription?.planKey ?? 'free'
	const planLabelKey = PLAN_LABEL_KEY[planKey]
	const planLabel = planLabelKey
		? tBilling(planLabelKey)
		: t('customPlanLabel')

	const catalogEntry = findCatalogPlan(catalog, planKey)
	const priceText = catalogEntry
		? formatAmount(catalogEntry.price, catalogEntry.currency)
		: '—'
	const periodSuffix = catalogEntry
		? `/${tBilling(`period.${catalogEntry.period}`)}`
		: ''

	const periodText = subscription
		? formatPeriod(
				subscription.currentPeriodStart,
				subscription.currentPeriodEnd,
				locale,
			)
		: null

	const featuresText =
		planKey === 'free' ? t('freeFeatures') : t('businessFeatures')

	const status = subscription?.status ?? null
	const statusLabelKey = status ? (STATUS_LABEL_KEY[status] ?? null) : null
	const statusLabel = statusLabelKey ? tStatus(statusLabelKey) : null
	const statusVariant = status
		? (STATUS_BADGE_VARIANT[status] ?? 'outline')
		: 'default'

	const cancelDate = subscription
		? getEffectiveCancelDate(subscription)
		: null

	const handleCancelClick = () => setDialogOpen(true)

	const renderCta = () => {
		if (!subscription) {
			return (
				<Link href={upgradeHref} className={cn(buttonVariants())}>
					{t('upgrade')}
				</Link>
			)
		}

		if (canCancelSubscription(subscription) && cancelDate) {
			return (
				<Button
					variant="outline"
					className="text-destructive hover:text-destructive"
					onClick={handleCancelClick}
				>
					{t('cancelAction')}
				</Button>
			)
		}

		if (status === 'scheduled_cancel' && cancelDate) {
			return (
				<p className="text-muted-foreground text-sm">
					{t('cancelScheduled', { date: formatDate(cancelDate, locale) })}
				</p>
			)
		}

		if (status === 'canceled' || status === 'expired') {
			return (
				<Link href={upgradeHref} className={cn(buttonVariants())}>
					{t('subscribeAgain')}
				</Link>
			)
		}

		if (status === 'past_due') {
			return <p className="text-muted-foreground text-sm">{t('pastDueHint')}</p>
		}

		if (status === 'paused') {
			return <p className="text-muted-foreground text-sm">{t('pausedHint')}</p>
		}

		return null
	}

	return (
		<>
			<Card className="rounded-xl shadow-sm">
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div className="flex flex-col gap-2">
						<CardTitle className="text-2xl font-semibold">{planLabel}</CardTitle>
						{statusLabel && <Badge variant={statusVariant}>{statusLabel}</Badge>}
					</div>
				</CardHeader>
				<CardContent className="grid gap-6 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<div className="flex items-baseline gap-1">
							<span className="text-3xl font-bold">{priceText}</span>
							{periodSuffix && (
								<span className="text-muted-foreground text-sm">
									{periodSuffix}
								</span>
							)}
						</div>
						{periodText && (
							<p className="text-muted-foreground text-sm">
								{t('currentPeriod')}: {periodText}
							</p>
						)}
					</div>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{featuresText}
					</p>
				</CardContent>
				<CardFooter>{renderCta()}</CardFooter>
			</Card>

			{subscription && cancelDate && (
				<CancelSubscriptionDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					cancelDate={cancelDate}
					onCancelled={onCancelled}
				/>
			)}
		</>
	)
}

export { PlanCard }
