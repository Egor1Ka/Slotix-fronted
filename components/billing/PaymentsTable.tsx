'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Receipt } from 'lucide-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import {
	formatAmount,
	formatDate,
	getEventLabelKey,
} from '@/lib/billing/format'
import type { BillingPayment } from '@/services/configs/billing.config'

interface PaymentsTableProps {
	payments: BillingPayment[]
	loading: boolean
}

const SKELETON_ROWS = [1, 2, 3]

const renderSkeletonRow = (i: number) => (
	<TableRow key={i}>
		<TableCell>
			<Skeleton className="h-4 w-24" />
		</TableCell>
		<TableCell>
			<Skeleton className="h-4 w-16" />
		</TableCell>
		<TableCell>
			<Skeleton className="h-5 w-20 rounded-full" />
		</TableCell>
		<TableCell>
			<Skeleton className="h-4 w-32" />
		</TableCell>
	</TableRow>
)

function PaymentsTable({ payments, loading }: PaymentsTableProps) {
	const t = useTranslations('billing.page')
	const tEvents = useTranslations('billing.events')
	const locale = useLocale()

	const renderRow = (payment: BillingPayment) => {
		const typeLabel =
			payment.type === 'subscription'
				? t('typeSubscription')
				: t('typeOneTime')
		const eventLabel = tEvents(getEventLabelKey(payment.eventType))

		return (
			<TableRow key={payment.id}>
				<TableCell className="font-medium">
					{formatDate(payment.createdAt, locale)}
				</TableCell>
				<TableCell>{formatAmount(payment.amount, payment.currency)}</TableCell>
				<TableCell>
					<Badge variant="secondary">{typeLabel}</Badge>
				</TableCell>
				<TableCell className="text-muted-foreground">{eventLabel}</TableCell>
			</TableRow>
		)
	}

	if (!loading && payments.length === 0) {
		return (
			<Empty className="bg-card border-border min-h-[200px] border shadow-sm">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Receipt />
					</EmptyMedia>
					<EmptyTitle>{t('paymentsEmpty')}</EmptyTitle>
					<EmptyDescription>{t('paymentsEmptyHint')}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t('colDate')}</TableHead>
						<TableHead>{t('colAmount')}</TableHead>
						<TableHead>{t('colType')}</TableHead>
						<TableHead>{t('colEvent')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{loading
						? SKELETON_ROWS.map(renderSkeletonRow)
						: payments.map(renderRow)}
				</TableBody>
			</Table>
		</div>
	)
}

export { PaymentsTable }
