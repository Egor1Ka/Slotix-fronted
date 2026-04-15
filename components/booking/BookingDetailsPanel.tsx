'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'
import type { BookingStatus } from '@/services/configs/booking.types'

interface CustomFieldEntry {
	fieldId: string
	label: string
	value: string
}

interface BookingDetail {
	id: string
	eventTypeId: string
	hosts: { userId: string; role: string }[]
	inviteeId: string
	orgId: string | null
	locationId: string | null
	startAt: string
	endAt: string
	timezone: string
	status: BookingStatus
	inviteeSnapshot: { name: string; email: string | null; phone: string | null }
	clientNotes: string | null
	customFieldValues?: CustomFieldEntry[]
	payment: { status: string; amount: number; currency: string }
	createdAt: string
	updatedAt: string
}

interface BookingDetailsPanelProps {
	booking: BookingDetail
	eventTypeName: string
	eventTypeColor: string
	staffName?: string
	staffAvatar?: string
	staffPosition?: string
	onChangeStatus: (bookingId: string, status: BookingStatus) => Promise<void>
	onReschedule: (bookingId: string, newStartAt: string) => Promise<void>
	onClose: () => void
}

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
	pending_payment: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
	confirmed: { bg: 'bg-green-100', text: 'text-green-800' },
	cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
	completed: { bg: 'bg-blue-100', text: 'text-blue-800' },
	no_show: { bg: 'bg-gray-100', text: 'text-gray-800' },
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
	pending_payment: ['confirmed', 'cancelled'],
	confirmed: ['completed', 'no_show', 'cancelled'],
}

const ACTION_BUTTON_CLASS: Record<string, string> = {
	confirmed: 'bg-primary text-primary-foreground hover:bg-primary/90',
	completed: 'bg-green-600 text-white hover:bg-green-700',
	cancelled:
		'bg-destructive text-destructive-foreground hover:bg-destructive/90',
	no_show: 'bg-muted text-muted-foreground hover:bg-muted/80',
}

const computeDurationMin = (startAt: string, endAt: string): number => {
	const startMs = new Date(startAt).getTime()
	const endMs = new Date(endAt).getTime()
	return Math.round((endMs - startMs) / 60000)
}

const formatTime = (isoString: string, timezone: string): string =>
	new Date(isoString).toLocaleTimeString('uk-UA', { // tz-ok: timeZone: timezone passed in options on next line
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

const formatDate = (isoString: string, timezone: string): string =>
	new Date(isoString).toLocaleDateString('uk-UA', { // tz-ok: timeZone: timezone passed in options on next line
		timeZone: timezone,
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})

function PanelHeader({
	eventTypeName,
	eventTypeColor,
	onClose,
	closeLabel,
}: {
	eventTypeName: string
	eventTypeColor: string
	onClose: () => void
	closeLabel: string
}) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<div
					className="size-3 rounded-full"
					style={{ backgroundColor: eventTypeColor }}
				/>
				<span className="text-sm font-semibold">{eventTypeName}</span>
			</div>
			<button
				type="button"
				onClick={onClose}
				aria-label={closeLabel}
				className="text-muted-foreground hover:text-foreground text-xs"
			>
				✕
			</button>
		</div>
	)
}

function TimeGrid({
	booking,
	t,
}: {
	booking: BookingDetail
	t: ReturnType<typeof useTranslations<'booking'>>
}) {
	const durationMin = computeDurationMin(booking.startAt, booking.endAt)

	return (
		<div className="grid grid-cols-2 gap-y-2 text-xs">
			<span className="text-muted-foreground">{t('startTime')}</span>
			<span className="font-medium">{formatTime(booking.startAt, booking.timezone)}</span>
			<span className="text-muted-foreground">{t('endTime')}</span>
			<span className="font-medium">{formatTime(booking.endAt, booking.timezone)}</span>
			<span className="text-muted-foreground">{t('duration')}</span>
			<span className="font-medium">
				{durationMin} {t('min')}
			</span>
			<span className="text-muted-foreground">{t('schedule.date')}</span>
			<span className="font-medium">{formatDate(booking.startAt, booking.timezone)}</span>
		</div>
	)
}

function CustomFieldRow({ entry }: { entry: CustomFieldEntry }) {
	return (
		<>
			<span className="text-muted-foreground">{entry.label}</span>
			<span className="font-medium">{entry.value}</span>
		</>
	)
}

function ClientSection({
	booking,
	t,
}: {
	booking: BookingDetail
	t: ReturnType<typeof useTranslations<'booking'>>
}) {
	const { name, email, phone } = booking.inviteeSnapshot
	const customFields = booking.customFieldValues ?? []

	const renderCustomField = (entry: CustomFieldEntry) => (
		<CustomFieldRow key={entry.fieldId} entry={entry} />
	)

	return (
		<div className="flex flex-col gap-2">
			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('clientName')}</span>
				<span className="font-medium">{name}</span>
				{email && (
					<>
						<span className="text-muted-foreground">{t('email')}</span>
						<span className="font-medium">{email}</span>
					</>
				)}
				{phone && (
					<>
						<span className="text-muted-foreground">{t('phone')}</span>
						<span className="font-medium">{phone}</span>
					</>
				)}
				{customFields.map(renderCustomField)}
			</div>
			{booking.clientNotes && (
				<p className="text-muted-foreground text-xs italic">
					{booking.clientNotes}
				</p>
			)}
		</div>
	)
}

function StatusAndPayment({
	booking,
	t,
}: {
	booking: BookingDetail
	t: ReturnType<typeof useTranslations<'booking'>>
}) {
	const statusCfg = STATUS_CONFIG[booking.status] ?? {
		bg: 'bg-gray-100',
		text: 'text-gray-800',
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<span
					className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
				>
					{t(`status_${booking.status}` as Parameters<typeof t>[0])}
				</span>
			</div>
			<div className="grid grid-cols-2 gap-y-1 text-xs">
				<span className="text-muted-foreground">{t('paymentStatus')}</span>
				<span className="font-medium">{booking.payment.status}</span>
				<span className="text-muted-foreground">{t('price')}</span>
				<span className="font-medium">
					{booking.payment.amount} {booking.payment.currency}
				</span>
			</div>
		</div>
	)
}

function ActionButtons({
	booking,
	onChangeStatus,
	t,
}: {
	booking: BookingDetail
	onChangeStatus: (bookingId: string, status: BookingStatus) => Promise<void>
	t: ReturnType<typeof useTranslations<'booking'>>
}) {
	const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null)
	const transitions = STATUS_TRANSITIONS[booking.status] ?? []

	if (transitions.length === 0) return null

	const handleClick = async (nextStatus: BookingStatus) => {
		setPendingStatus(nextStatus)
		await onChangeStatus(booking.id, nextStatus)
		setPendingStatus(null)
	}

	const renderButton = (nextStatus: string) => {
		const buttonClass =
			ACTION_BUTTON_CLASS[nextStatus] ??
			'bg-muted text-muted-foreground hover:bg-muted/80'
		const isLoading = pendingStatus === nextStatus

		return (
			<button
				key={nextStatus}
				type="button"
				disabled={pendingStatus !== null}
				onClick={() => handleClick(nextStatus as BookingStatus)}
				className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${buttonClass}`}
			>
				{isLoading
					? t('saving')
					: `${t('markAs')} ${t(`status_${nextStatus}` as Parameters<typeof t>[0])}`}
			</button>
		)
	}

	return (
		<div className="flex flex-wrap gap-2">{transitions.map(renderButton)}</div>
	)
}

function StaffSection({
	staffName,
	staffAvatar,
	staffPosition,
}: {
	staffName: string
	staffAvatar?: string
	staffPosition?: string
}) {
	const renderAvatar = () => {
		if (staffAvatar) {
			return (
				<img
					src={staffAvatar}
					alt={staffName}
					className="size-8 shrink-0 rounded-full object-cover"
				/>
			)
		}

		return (
			<div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
				{staffName.charAt(0).toUpperCase()}
			</div>
		)
	}

	return (
		<div className="flex items-center gap-3">
			{renderAvatar()}
			<div className="flex flex-col">
				<span className="text-sm font-medium">{staffName}</span>
				{staffPosition && (
					<span className="text-muted-foreground text-xs">{staffPosition}</span>
				)}
			</div>
		</div>
	)
}

function BookingDetailsPanel({
	booking,
	eventTypeName,
	eventTypeColor,
	staffName,
	staffAvatar,
	staffPosition,
	onChangeStatus,
	onClose,
}: BookingDetailsPanelProps) {
	const t = useTranslations('booking')

	return (
		<div className="flex flex-col gap-3">
			<PanelHeader
				eventTypeName={eventTypeName}
				eventTypeColor={eventTypeColor}
				onClose={onClose}
				closeLabel={t('close')}
			/>
			{staffName && (
				<>
					<Separator />
					<StaffSection
						staffName={staffName}
						staffAvatar={staffAvatar}
						staffPosition={staffPosition}
					/>
				</>
			)}
			<Separator />
			<TimeGrid booking={booking} t={t} />
			<Separator />
			<ClientSection booking={booking} t={t} />
			<Separator />
			<StatusAndPayment booking={booking} t={t} />
			<Separator />
			<ActionButtons booking={booking} onChangeStatus={onChangeStatus} t={t} />
		</div>
	)
}

export type { BookingDetail }
export { BookingDetailsPanel }
