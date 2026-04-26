'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2Icon, RotateCcwIcon } from 'lucide-react'

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

import { ClientInfoForm, type ClientInfoData } from './ClientInfoForm'
import { ConfettiBurst } from './ConfettiBurst'
import { wallClockInTz } from '@/lib/calendar/tz'

import type { EventType } from '@/services/configs/booking.types'
import type { ConfirmedBooking } from '@/lib/calendar/types'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'

interface BookingFlowDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	eventType: EventType | null
	staffName: string | null
	staffAvatar: string | null
	slotTime: string | null
	slotDate: string | null
	formConfig: MergedBookingForm | null
	onSubmit: (data: ClientInfoData) => Promise<ConfirmedBooking | null>
	isSubmitting: boolean
	shareUrl: string // TODO: remove in next refactor pass after pages stop passing it
	onBookAgain: () => void
	onSuccessNavigate?: (result: ConfirmedBooking) => void
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

const formatLocalTime = (iso: string, timezone: string): string => {
	const wc = wallClockInTz(iso, timezone)
	return `${pad2(wc.hour)}:${pad2(wc.minute)}`
}

const getInitial = (part: string): string => part[0] ?? ''

const getInitials = (name: string): string =>
	name.split(' ').map(getInitial).join('').toUpperCase().slice(0, 2)

interface HeaderProps {
	eventType: EventType | null
	staffName: string | null
	staffAvatar: string | null
	slotTime: string | null
	slotDate: string | null
}

function BookingFlowHeader({
	eventType,
	staffName,
	staffAvatar,
	slotTime,
	slotDate,
}: HeaderProps) {
	const t = useTranslations('booking')
	return (
		<div className="flex flex-col gap-3">
			{eventType && (
				<div className="flex items-center gap-3">
					<div
						className="size-3 shrink-0 rounded-full"
						style={{ backgroundColor: eventType.color }}
					/>
					<div className="flex flex-col">
						<span className="text-sm font-medium">{eventType.name}</span>
						<span className="text-muted-foreground text-xs">
							{eventType.durationMin} {t('min')} · {eventType.price}{' '}
							{eventType.currency}
						</span>
					</div>
				</div>
			)}

			{staffName && (
				<div className="flex items-center gap-3">
					<Avatar className="size-8">
						{staffAvatar && <AvatarImage src={staffAvatar} alt={staffName} />}
						<AvatarFallback className="text-xs">
							{getInitials(staffName)}
						</AvatarFallback>
					</Avatar>
					<span className="text-sm font-medium">{staffName}</span>
				</div>
			)}

			{slotTime && slotDate && (
				<Badge variant="outline" className="w-fit text-sm">
					{slotDate} · {slotTime}
				</Badge>
			)}
		</div>
	)
}

interface FormStateProps {
	formConfig: MergedBookingForm | null
	isSubmitting: boolean
	error: string | null
	onSubmit: (data: ClientInfoData) => void
}

function BookingFlowForm({
	formConfig,
	isSubmitting,
	error,
	onSubmit,
}: FormStateProps) {
	if (!formConfig) return null
	return (
		<div className="flex flex-col gap-3">
			{error && (
				<div className="text-destructive bg-destructive/10 rounded-md p-3 text-sm">
					{error}
				</div>
			)}
			<ClientInfoForm
				formConfig={formConfig}
				onSubmit={onSubmit}
				isSubmitting={isSubmitting}
			/>
		</div>
	)
}

interface SummaryCardProps {
	result: ConfirmedBooking
	clientName: string | null
	staffName: string | null
}

function BookingSummaryCard({
	result,
	clientName,
	staffName,
}: SummaryCardProps) {
	const t = useTranslations('booking')
	const startTime = formatLocalTime(result.startAt, result.timezone)
	const endTime = formatLocalTime(result.endAt, result.timezone)
	const statusLabel = result.status.isDefault
		? t(result.status.label)
		: result.status.label

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center gap-2">
				<div
					className="size-3 rounded-full"
					style={{ backgroundColor: result.color }}
				/>
				<span className="text-sm font-medium">{result.eventTypeName}</span>
			</div>
			<Separator />
			<div className="grid grid-cols-2 gap-y-2 text-xs">
				{staffName && (
					<>
						<span className="text-muted-foreground">{t('success.staff')}</span>
						<span className="font-medium">{staffName}</span>
					</>
				)}
				{clientName && (
					<>
						<span className="text-muted-foreground">{t('success.client')}</span>
						<span className="font-medium">{clientName}</span>
					</>
				)}
				<span className="text-muted-foreground">{t('startTime')}</span>
				<span className="font-medium">{startTime}</span>
				<span className="text-muted-foreground">{t('endTime')}</span>
				<span className="font-medium">{endTime}</span>
				<span className="text-muted-foreground">{t('duration')}</span>
				<span className="font-medium">
					{result.durationMin} {t('min')}
				</span>
				<span className="text-muted-foreground">{t('price')}</span>
				<span className="font-medium">
					{result.price} {result.currency}
				</span>
				<span className="text-muted-foreground">{t('status')}</span>
				<span className="font-medium">{statusLabel}</span>
			</div>
		</div>
	)
}

function SuccessActions({ onBookAgain }: { onBookAgain: () => void }) {
	const t = useTranslations('booking')
	return (
		<div className="flex flex-col gap-2">
			<Button onClick={onBookAgain} className="w-full">
				<RotateCcwIcon className="mr-2 size-4" />
				{t('success.bookAgain')}
			</Button>
		</div>
	)
}

interface SuccessStateProps {
	result: ConfirmedBooking
	staffName: string | null
	onBookAgain: () => void
	burstTargetRef: React.RefObject<HTMLElement | null>
}

function BookingFlowSuccess({
	result,
	staffName,
	onBookAgain,
	burstTargetRef,
}: SuccessStateProps) {
	const t = useTranslations('booking')
	const inviteeName = result.invitee?.name ?? null

	return (
		<div className="flex flex-col gap-4">
			<ConfettiBurst targetRef={burstTargetRef} />
			<div className="flex items-center gap-2 text-green-600">
				<CheckCircle2Icon className="size-5" />
				<span className="text-sm font-semibold">{t('success.title')}</span>
			</div>
			<p className="text-muted-foreground text-xs">{t('success.subtitle')}</p>
			<BookingSummaryCard
				result={result}
				clientName={inviteeName}
				staffName={staffName}
			/>
			<SuccessActions onBookAgain={onBookAgain} />
		</div>
	)
}

function BookingFlowDialog({
	open,
	onOpenChange,
	eventType,
	staffName,
	staffAvatar,
	slotTime,
	slotDate,
	formConfig,
	onSubmit,
	isSubmitting,
	onBookAgain,
	onSuccessNavigate,
}: BookingFlowDialogProps) {
	const t = useTranslations('booking')
	const [result, setResult] = useState<ConfirmedBooking | null>(null)
	const [submitError, setSubmitError] = useState<string | null>(null)
	const contentRef = useRef<HTMLDivElement | null>(null)

	const handleSubmit = async (data: ClientInfoData) => {
		setSubmitError(null)
		try {
			const confirmed = await onSubmit(data)
			if (confirmed) {
				if (onSuccessNavigate) {
					onSuccessNavigate(confirmed)
					onOpenChange(false)
				} else {
					setResult(confirmed)
				}
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : t('bookingFailed')
			setSubmitError(message)
		}
	}

	const handleOpenChange = (next: boolean) => {
		if (!next && isSubmitting) return
		if (!next) {
			setResult(null)
			setSubmitError(null)
		}
		onOpenChange(next)
	}

	const handleBookAgain = () => {
		setResult(null)
		setSubmitError(null)
		onBookAgain()
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent>
				<div ref={contentRef} className="flex flex-1 flex-col">
					<SheetHeader>
						<SheetTitle>
							{result ? t('success.title') : t('confirmBookingTitle')}
						</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col gap-4 p-4">
						<BookingFlowHeader
							eventType={eventType}
							staffName={staffName}
							staffAvatar={staffAvatar}
							slotTime={slotTime}
							slotDate={slotDate}
						/>
						<Separator />
						{result ? (
							<BookingFlowSuccess
								result={result}
								staffName={staffName}
								onBookAgain={handleBookAgain}
								burstTargetRef={contentRef}
							/>
						) : (
							<BookingFlowForm
								formConfig={formConfig}
								isSubmitting={isSubmitting}
								error={submitError}
								onSubmit={handleSubmit}
							/>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { BookingFlowDialog }
export type { BookingFlowDialogProps }
