'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { bookingApi } from '@/lib/booking-api-client'
import { formatLocalTime } from './BookingPanelParts'
import type { BookingStatus } from '@/services/configs/booking.types'

interface BookingDetail {
	id: string
	eventTypeName: string
	color: string
	startAt: string
	endAt: string
	timezone: string
	durationMin: number
	date: string
	status: BookingStatus
	invitee: {
		name: string
		email: string | null
		phone: string | null
	}
	payment: {
		status: string
		amount: number
		currency: string
	}
}

interface BookingDetailPanelProps {
	booking: BookingDetail
	onClose: () => void
	onStatusChange: (bookingId: string, newStatus: BookingStatus) => void
}

const STATUS_VARIANT: Record<
	BookingStatus,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	confirmed: 'default',
	pending_payment: 'secondary',
	completed: 'outline',
	no_show: 'secondary',
	cancelled: 'destructive',
}

const ALLOWED_TRANSITIONS: Record<string, BookingStatus[]> = {
	pending_payment: ['confirmed', 'cancelled'],
	confirmed: ['completed', 'no_show', 'cancelled'],
}

const ACTION_CONFIG: Record<
	string,
	{ translationKey: string; variant: 'default' | 'outline' | 'destructive' }
> = {
	completed: { translationKey: 'markCompleted', variant: 'default' },
	no_show: { translationKey: 'markNoShow', variant: 'outline' },
	cancelled: { translationKey: 'markCancelled', variant: 'destructive' },
	confirmed: { translationKey: 'confirmed', variant: 'default' },
}

function BookingDetailPanel({
	booking,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onClose,
	onStatusChange,
}: BookingDetailPanelProps) {
	const t = useTranslations('booking')
	const [isUpdating, setIsUpdating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const allowedStatuses = ALLOWED_TRANSITIONS[booking.status] ?? []

	const handleStatusChange = async (newStatus: BookingStatus) => {
		try {
			setIsUpdating(true)
			setError(null)
			await bookingApi.updateStatus(booking.id, newStatus)
			onStatusChange(booking.id, newStatus)
		} catch {
			setError(t('statusUpdateFailed'))
		} finally {
			setIsUpdating(false)
		}
	}

	const formatDate = (isoString: string): string => {
		const d = new Date(isoString)
		return d.toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
	}

	const renderActionButton = (status: BookingStatus) => {
		const config = ACTION_CONFIG[status]
		if (!config) return null
		const handleClick = () => handleStatusChange(status)

		return (
			<Button
				key={status}
				variant={config.variant}
				size="sm"
				className="w-full"
				onClick={handleClick}
				disabled={isUpdating}
			>
				{t(config.translationKey)}
			</Button>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<div
					className="size-3 shrink-0 rounded-full"
					style={{ backgroundColor: booking.color }}
				/>
				<span className="text-sm font-semibold">{booking.eventTypeName}</span>
			</div>

			<Separator />

			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('startTime')}</span>
				<span className="font-medium">{formatLocalTime(booking.startAt, booking.timezone)}</span>
				<span className="text-muted-foreground">{t('endTime')}</span>
				<span className="font-medium">{formatLocalTime(booking.endAt, booking.timezone)}</span>
				<span className="text-muted-foreground">{t('duration')}</span>
				<span className="font-medium">
					{booking.durationMin} {t('min')}
				</span>
				<span className="text-muted-foreground">{t('date')}</span>
				<span className="font-medium">{formatDate(booking.startAt)}</span>
			</div>

			<Separator />

			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('clientName_label')}</span>
				<span className="font-medium">{booking.invitee.name}</span>
				{booking.invitee.email && (
					<>
						<span className="text-muted-foreground">{t('email')}</span>
						<span className="font-medium">{booking.invitee.email}</span>
					</>
				)}
				{booking.invitee.phone && (
					<>
						<span className="text-muted-foreground">{t('phone')}</span>
						<span className="font-medium">{booking.invitee.phone}</span>
					</>
				)}
			</div>

			<Separator />

			<div className="flex items-center gap-2">
				<Badge variant={STATUS_VARIANT[booking.status]}>
					{t(booking.status)}
				</Badge>
			</div>

			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('payment')}</span>
				<span className="font-medium">{booking.payment.status}</span>
				<span className="text-muted-foreground">{t('price')}</span>
				<span className="font-medium">
					{booking.payment.amount} {booking.payment.currency}
				</span>
			</div>

			{allowedStatuses.length > 0 && (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						{allowedStatuses.map(renderActionButton)}
					</div>
				</>
			)}

			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	)
}

export { BookingDetailPanel }
export type { BookingDetail }
