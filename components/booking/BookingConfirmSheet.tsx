'use client'

import { useTranslations } from 'next-intl'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ClientInfoForm, type ClientInfoData } from './ClientInfoForm'
import type { EventType } from '@/services/configs/booking.types'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'

interface BookingConfirmSheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	eventType: EventType | null
	staffName: string | null
	staffAvatar: string | null
	slotTime: string | null
	slotDate: string | null
	formConfig: MergedBookingForm | null
	onConfirm: (data: ClientInfoData) => void
	isSubmitting: boolean
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function BookingConfirmSheet({
	open,
	onOpenChange,
	eventType,
	staffName,
	staffAvatar,
	slotTime,
	slotDate,
	formConfig,
	onConfirm,
	isSubmitting,
}: BookingConfirmSheetProps) {
	const t = useTranslations('booking')

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{t('confirmBookingTitle')}</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-4 p-4">
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
								{staffAvatar && (
									<AvatarImage src={staffAvatar} alt={staffName} />
								)}
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

					<Separator />

					{formConfig && (
						<ClientInfoForm
							formConfig={formConfig}
							onSubmit={onConfirm}
							isSubmitting={isSubmitting}
						/>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { BookingConfirmSheet }
