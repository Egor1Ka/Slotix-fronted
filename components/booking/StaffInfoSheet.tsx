'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { InfoIcon } from 'lucide-react'
import { staffApi } from '@/lib/booking-api-client'
import type { StaffBySlugResponse } from '@/services/configs/booking.types'

interface StaffInfoSheetProps {
	staffId: string
	name: string
	avatar: string
	position: string | null
	bio: string | null
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function StaffInfoSheet({
	staffId,
	name,
	avatar,
	position,
	bio,
}: StaffInfoSheetProps) {
	const t = useTranslations('booking')
	const [fullProfile, setFullProfile] = useState<StaffBySlugResponse | null>(
		null,
	)
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open || fullProfile) return
		const loadProfile = async () => {
			try {
				const profile = await staffApi.getById(staffId)
				setFullProfile(profile)
			} catch {
				// Если загрузка не удалась — показываем то, что есть
			}
		}
		loadProfile()
	}, [open, staffId, fullProfile])

	const displayBio = fullProfile?.bio ?? bio
	const displayPhone = fullProfile?.phone ?? null
	const displayAddress = fullProfile?.address ?? null
	const displayWebsite = fullProfile?.website ?? null

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				render={
					<Button variant="ghost" size="icon-sm" className="shrink-0">
						<InfoIcon className="size-4" />
					</Button>
				}
			/>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{t('aboutStaff')}</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-4 p-4">
					<div className="flex items-center gap-3">
						<Avatar className="size-14">
							<AvatarImage src={avatar} alt={name} />
							<AvatarFallback>{getInitials(name)}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-base font-semibold">{name}</span>
							{position && (
								<span className="text-muted-foreground text-sm">
									{position}
								</span>
							)}
						</div>
					</div>

					{displayBio && (
						<p className="text-muted-foreground text-sm leading-relaxed">
							{displayBio}
						</p>
					)}

					{displayPhone && (
						<a
							href={`tel:${displayPhone}`}
							className="text-primary text-sm hover:underline"
						>
							{displayPhone}
						</a>
					)}

					{displayAddress && (
						<p className="text-muted-foreground text-sm">{displayAddress}</p>
					)}

					{displayWebsite && (
						<a
							href={displayWebsite}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary text-sm hover:underline"
						>
							{displayWebsite}
						</a>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { StaffInfoSheet }
