'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { billingApi } from '@/services'
import { formatDate } from '@/lib/billing/format'

interface CancelSubscriptionDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	cancelDate: string
	onCancelled: () => void
}

function CancelSubscriptionDialog({
	open,
	onOpenChange,
	cancelDate,
	onCancelled,
}: CancelSubscriptionDialogProps) {
	const t = useTranslations('billing.page')
	const locale = useLocale()
	const [submitting, setSubmitting] = useState(false)
	const formatted = formatDate(cancelDate, locale)

	const handleConfirm = async () => {
		setSubmitting(true)
		try {
			await billingApi.cancel()
			toast.success(t('cancelSuccessToast', { date: formatted }))
			onCancelled()
			onOpenChange(false)
		} catch {
			// toast interceptor handles errors
		} finally {
			setSubmitting(false)
		}
	}

	const handleDismiss = () => {
		if (submitting) return
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('cancelDialogTitle')}</DialogTitle>
					<DialogDescription>
						{t('cancelDialogDescription', { date: formatted })}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={handleDismiss}
						disabled={submitting}
					>
						{t('cancelDialogDismiss')}
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={submitting}
					>
						{submitting && <Spinner className="size-4" />}
						{t('cancelDialogConfirm')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export { CancelSubscriptionDialog }
