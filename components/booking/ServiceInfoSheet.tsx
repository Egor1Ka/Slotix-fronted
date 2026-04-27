'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { InfoIcon } from 'lucide-react'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { eventTypeApi } from '@/lib/booking-api-client'
import { StaffInfoSheet } from './StaffInfoSheet'
import type {
	EventType,
	OrgStaffMember,
} from '@/services/configs/booking.types'

interface ServiceInfoSheetProps {
	eventType: EventType
	onBook?: () => void
	trigger?: React.ReactElement
}

const getInitial = (text: string): string =>
	text.trim() ? text.trim().charAt(0).toUpperCase() : '?'

const buildStaffItemRenderer = () => (member: OrgStaffMember) => (
	<div
		key={member.id}
		className="hover:bg-muted/60 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors"
	>
		<Avatar className="size-12">
			{member.avatar ? (
				<AvatarImage src={member.avatar} alt={member.name} />
			) : null}
			<AvatarFallback>{getInitial(member.name)}</AvatarFallback>
		</Avatar>
		<div className="flex flex-1 flex-col">
			<span className="text-sm font-semibold leading-tight">{member.name}</span>
			{member.position ? (
				<span className="text-muted-foreground text-xs">{member.position}</span>
			) : null}
		</div>
		<StaffInfoSheet
			staffId={member.id}
			name={member.name}
			avatar={member.avatar}
			position={member.position ?? null}
			bio={member.bio ?? null}
		/>
	</div>
)

function ServiceInfoSheet({
	eventType,
	onBook,
	trigger,
}: ServiceInfoSheetProps) {
	const t = useTranslations('booking')
	const [open, setOpen] = useState(false)
	const [staff, setStaff] = useState<OrgStaffMember[] | null>(null)
	const [staffLoaded, setStaffLoaded] = useState(false)

	useEffect(() => {
		if (!open || staffLoaded) return
		const load = async () => {
			try {
				const data = await eventTypeApi.getStaffForEventType(eventType.id)
				setStaff(data)
			} catch {
				setStaff([])
			} finally {
				setStaffLoaded(true)
			}
		}
		load()
	}, [open, eventType.id, staffLoaded])

	const handleBook = () => {
		setOpen(false)
		if (onBook) onBook()
	}

	const heroSrc = eventType.ogImage ?? eventType.image ?? null

	const defaultTrigger = (
		<Button
			variant="ghost"
			size="icon-sm"
			type="button"
			className="absolute top-2 right-2 size-8 bg-black/35 text-white hover:bg-black/55 backdrop-blur"
			aria-label={t('aboutService')}
		>
			<InfoIcon className="size-4" />
		</Button>
	)

	const renderStaffItem = buildStaffItemRenderer()

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger render={trigger ?? defaultTrigger} />
			<SheetContent className="w-full overflow-y-auto p-0 sm:max-w-md">
				<SheetHeader className="sr-only">
					<SheetTitle>{eventType.name}</SheetTitle>
				</SheetHeader>

				<div
					className="relative aspect-2/1 w-full overflow-hidden"
					style={{ backgroundColor: eventType.color }}
				>
					{heroSrc ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={heroSrc}
							alt={eventType.name}
							className="size-full object-cover"
						/>
					) : (
						<div className="flex size-full items-center justify-center text-7xl font-bold text-white">
							{getInitial(eventType.name)}
						</div>
					)}
				</div>

				<section className="flex flex-col gap-3 px-6 pt-5 pb-4">
					<h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						{t('whoLeads')}
					</h4>
					{!staffLoaded ? (
						<div className="text-muted-foreground flex items-center gap-2 px-2 text-sm">
							<Spinner className="size-4" />
							{t('loading')}
						</div>
					) : !staff || staff.length === 0 ? (
						<div className="text-muted-foreground px-2 text-sm">
							{t('anyStaff')}
						</div>
					) : (
						<div className="flex flex-col gap-1">
							{staff.map(renderStaffItem)}
						</div>
					)}
				</section>

				<section className="flex flex-col gap-2 border-t px-6 py-5">
					<h2 className="text-2xl font-bold tracking-tight">
						{eventType.name}
					</h2>
					<div className="flex items-baseline gap-2">
						<span className="text-primary text-xl font-semibold">
							{eventType.price} {eventType.currency}
						</span>
						<span className="text-muted-foreground text-sm">
							· {eventType.durationMin} {t('min')}
						</span>
					</div>
					{eventType.description ? (
						<p className="text-foreground/80 mt-2 text-sm leading-relaxed whitespace-pre-wrap">
							{eventType.description}
						</p>
					) : null}
				</section>

				{onBook ? (
					<div className="bg-background sticky bottom-0 border-t p-4">
						<Button onClick={handleBook} className="w-full" size="lg">
							{t('bookThisService')}
						</Button>
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	)
}

export { ServiceInfoSheet }
