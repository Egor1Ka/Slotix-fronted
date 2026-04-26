'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { bookingApi } from '@/lib/booking-api-client'
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { formatLocalTime } from './BookingPanelParts'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

interface BookingDetail {
	id: string
	eventTypeName: string
	color: string
	startAt: string
	endAt: string
	timezone: string
	durationMin: number
	date: string
	statusId: string
	status: BookingStatusObject
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
	availableStatuses: BookingStatusObject[]
	onClose: () => void
	onStatusChange: (bookingId: string, newStatusId: string) => void
}

function BookingDetailPanel({
	booking,
	availableStatuses,
	onClose,
	onStatusChange,
}: BookingDetailPanelProps) {
	const t = useTranslations('booking')
	const [isUpdating, setIsUpdating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const isNotCurrentStatus = (s: BookingStatusObject): boolean =>
		s.id !== booking.statusId
	const otherStatuses = availableStatuses.filter(isNotCurrentStatus)

	const handleStatusChange = async (statusId: string) => {
		try {
			setIsUpdating(true)
			setError(null)
			await bookingApi.updateStatus(booking.id, statusId)
			onStatusChange(booking.id, statusId)
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

	const renderStatusButton = (targetStatus: BookingStatusObject) => {
		const handleClick = () => handleStatusChange(targetStatus.id)
		const label = targetStatus.isDefault
			? t(targetStatus.label as Parameters<typeof t>[0])
			: targetStatus.label

		return (
			<Button
				key={targetStatus.id}
				variant="outline"
				size="sm"
				className="w-full"
				onClick={handleClick}
				disabled={isUpdating}
			>
				{label}
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
				<span className="font-medium">
					{formatLocalTime(booking.startAt, booking.timezone)}
				</span>
				<span className="text-muted-foreground">{t('endTime')}</span>
				<span className="font-medium">
					{formatLocalTime(booking.endAt, booking.timezone)}
				</span>
				<span className="text-muted-foreground">{t('duration')}</span>
				<span className="font-medium">
					{booking.durationMin} {t('min')}
				</span>
				{booking.payment.amount > 0 && (
					<>
						<span className="text-muted-foreground">{t('price')}</span>
						<span className="font-medium">
							{booking.payment.amount} {booking.payment.currency}
						</span>
					</>
				)}
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
				<BookingStatusBadge status={booking.status} />
			</div>

			{otherStatuses.length > 0 && (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						{otherStatuses.map(renderStatusButton)}
					</div>
				</>
			)}

			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	)
}

export { BookingDetailPanel }
export type { BookingDetail }
