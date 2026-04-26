'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle2Icon, CalendarPlusIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ConfettiBurst } from '@/components/booking/ConfettiBurst'
import { wallClockInTz } from '@/lib/calendar/tz'
import {
	readBookingSuccess,
	clearBookingSuccess,
	type BookingSuccessPayload,
} from '@/lib/booking/booking-success-storage'

const pad2 = (n: number): string => String(n).padStart(2, '0')

const formatLocalTime = (iso: string, timezone: string): string => {
	const wc = wallClockInTz(iso, timezone)
	return `${pad2(wc.hour)}:${pad2(wc.minute)}`
}

const formatLocalDate = (iso: string, timezone: string): string => {
	const wc = wallClockInTz(iso, timezone)
	return `${pad2(wc.day)}.${pad2(wc.month)}.${wc.year}`
}

const getInitial = (part: string): string => part[0] ?? ''

const getInitials = (name: string): string =>
	name.split(' ').map(getInitial).join('').toUpperCase().slice(0, 2)

interface SummaryRowProps {
	label: string
	value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
	return (
		<>
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium">{value}</span>
		</>
	)
}

interface SuccessContentProps {
	payload: BookingSuccessPayload
	confettiTargetRef: React.RefObject<HTMLDivElement | null>
}

function SuccessContent({ payload, confettiTargetRef }: SuccessContentProps) {
	const router = useRouter()
	const t = useTranslations('booking')
	const { result, staffName, staffAvatar } = payload
	const startTime = formatLocalTime(result.startAt, result.timezone)
	const endTime = formatLocalTime(result.endAt, result.timezone)
	const dateLabel = formatLocalDate(result.startAt, result.timezone)
	const inviteeName = result.invitee?.name ?? null
	const statusLabel = result.status.isDefault
		? t(result.status.label)
		: result.status.label

	const handleBookAgain = () => {
		clearBookingSuccess()
		router.push(payload.returnUrl)
	}

	return (
		<div className="from-background via-background to-primary/5 flex min-h-[100dvh] flex-col items-center justify-start bg-gradient-to-br px-4 pt-8 pb-6 sm:justify-center sm:py-12">
			<ConfettiBurst targetRef={confettiTargetRef} />

			<div
				ref={confettiTargetRef}
				className="flex w-full max-w-md flex-col items-center gap-5 sm:gap-6"
			>
				<div className="animate-in fade-in zoom-in-95 flex size-20 items-center justify-center rounded-full bg-green-500/10 ring-4 ring-green-500/20 duration-500 sm:size-24">
					<CheckCircle2Icon className="size-10 text-green-600 sm:size-12" />
				</div>

				<div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col items-center gap-2 text-center duration-500">
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						{t('success.title')}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t('success.subtitle')}
					</p>
				</div>

				<div className="bg-card animate-in fade-in slide-in-from-bottom-4 flex w-full flex-col gap-4 rounded-xl border p-5 shadow-lg duration-700">
					<div className="flex items-center gap-2.5">
						<div
							className="size-3 rounded-full"
							style={{ backgroundColor: result.color }}
						/>
						<span className="text-base font-semibold">
							{result.eventTypeName}
						</span>
					</div>

					{staffName && (
						<>
							<Separator />
							<div className="flex items-center gap-3">
								<Avatar className="size-10">
									{staffAvatar && (
										<AvatarImage src={staffAvatar} alt={staffName} />
									)}
									<AvatarFallback className="text-xs">
										{getInitials(staffName)}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col">
									<span className="text-muted-foreground text-xs">
										{t('success.staff')}
									</span>
									<span className="text-sm font-medium">{staffName}</span>
								</div>
							</div>
						</>
					)}

					<Separator />
					<div className="grid grid-cols-2 gap-y-2.5 text-xs">
						{inviteeName && (
							<SummaryRow label={t('success.client')} value={inviteeName} />
						)}
						<SummaryRow label={t('date')} value={dateLabel} />
						<SummaryRow label={t('startTime')} value={startTime} />
						<SummaryRow label={t('endTime')} value={endTime} />
						<SummaryRow
							label={t('duration')}
							value={`${result.durationMin} ${t('min')}`}
						/>
						<SummaryRow
							label={t('price')}
							value={`${result.price} ${result.currency}`}
						/>
						<SummaryRow label={t('status')} value={statusLabel} />
					</div>
				</div>

				<Button
					onClick={handleBookAgain}
					className="animate-in fade-in slide-in-from-bottom-2 h-14 w-full text-base font-semibold duration-500"
				>
					<CalendarPlusIcon className="mr-2 size-5" />
					{t('success.bookAgain')}
				</Button>
			</div>
		</div>
	)
}

function NotFoundContent() {
	const t = useTranslations('booking')
	const router = useRouter()
	const locale = useLocale()

	const handleGoHome = () => {
		router.push(`/${locale}`)
	}

	return (
		<div className="bg-background flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
			<div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
				<h1 className="text-xl font-semibold">{t('success.notFound')}</h1>
				<p className="text-muted-foreground text-sm">
					{t('success.notFoundHint')}
				</p>
				<Button onClick={handleGoHome} variant="outline">
					{t('success.goHome')}
				</Button>
			</div>
		</div>
	)
}

function BookingSuccessView() {
	const [payload, setPayload] = useState<BookingSuccessPayload | null>(null)
	const [hydrated, setHydrated] = useState(false)
	const confettiTargetRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		// читаємо sessionStorage один раз після монтування — нормальний кейс,
		// лінт-правило не релевантне для зчитування браузерного API
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setPayload(readBookingSuccess())
		setHydrated(true)
	}, [])

	if (!hydrated) return null
	if (!payload) return <NotFoundContent />
	return (
		<SuccessContent payload={payload} confettiTargetRef={confettiTargetRef} />
	)
}

export { BookingSuccessView }
