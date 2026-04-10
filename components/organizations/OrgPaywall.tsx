'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import type { BillingCatalog } from '@/services'
import { CreemCheckout } from '@creem_io/nextjs'
import { Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface OrgPaywallProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	catalog: BillingCatalog | null
}

function OrgPaywall({ open, onOpenChange, catalog }: OrgPaywallProps) {
	const t = useTranslations('billing.orgCreator')

	const orgCreatorPlan = catalog
		? catalog.plans.find((p) => p.key === 'org_creator')
		: null

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Lock className="size-5" />
						{t('paywallTitle')}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-muted-foreground text-sm">
						{t('paywallDescription')}
					</p>
					<p className="text-lg font-semibold">{t('paywallPrice')}</p>
					{orgCreatorPlan && orgCreatorPlan.productId && (
						<CreemCheckout
							productId={orgCreatorPlan.productId}
							checkoutPath="/api/checkout"
						>
							<Button className="w-full">{t('subscribe')}</Button>
						</CreemCheckout>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

export { OrgPaywall }
