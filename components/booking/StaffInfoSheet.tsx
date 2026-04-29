'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
import { InfoIcon, MapPin, Phone, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { staffApi } from '@/lib/booking-api-client'
import type { StaffBySlugResponse } from '@/services/configs/booking.types'
import { ReviewSection } from '@/components/reviews/ReviewSection'
import { RatingSummary } from '@/components/reviews/RatingSummary'
import { useOptionalUser } from '@/lib/auth/user-provider'
import type { RatingSummary as RatingSummaryData } from '@/services'

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
	const tReviews = useTranslations('reviews')
	const params = useParams<{ orgId?: string }>()
	const currentUser = useOptionalUser()
	const currentUserId = currentUser?.id ?? null
	const [fullProfile, setFullProfile] = useState<StaffBySlugResponse | null>(
		null,
	)
	const [open, setOpen] = useState(false)
	const [summary, setSummary] = useState<RatingSummaryData | null>(null)
	const [bioExpanded, setBioExpanded] = useState(false)
	const handleToggleBio = () => setBioExpanded((prev) => !prev)

	useEffect(() => {
		if (!open || fullProfile) return
		const loadProfile = async () => {
			try {
				const profile = await staffApi.getById(staffId, params.orgId)
				setFullProfile(profile)
			} catch {
				// Если загрузка не удалась — показываем то, что есть
			}
		}
		loadProfile()
	}, [open, staffId, fullProfile])

	const displayBio = fullProfile?.bio ?? fullProfile?.description ?? bio
	const displayPhone = fullProfile?.phone ?? null
	const displayAddress = fullProfile?.address ?? null
	const displayWebsite = fullProfile?.website ?? null
	const isLongBio = displayBio ? displayBio.length > 180 : false

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
					<div className="flex items-start gap-3">
						<Avatar className="ring-background size-14 ring-2 ring-offset-2 ring-offset-transparent">
							<AvatarImage src={avatar} alt={name} />
							<AvatarFallback className="font-semibold">
								{getInitials(name)}
							</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<span className="truncate text-base leading-tight font-semibold">
								{name}
							</span>
							{position && (
								<span className="text-muted-foreground truncate text-sm">
									{position}
								</span>
							)}
							{summary && summary.count > 0 ? (
								<RatingSummary
									avg={summary.avg}
									count={summary.count}
									size="sm"
									variant="badge"
									className="mt-1 self-start"
								/>
							) : null}
						</div>
					</div>

					{displayBio ? (
						<div className="flex flex-col gap-1.5">
							<p
								className={cn(
									'text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap',
									!bioExpanded && isLongBio && 'line-clamp-4',
								)}
							>
								{displayBio}
							</p>
							{isLongBio ? (
								<button
									type="button"
									onClick={handleToggleBio}
									className="text-primary self-start text-xs font-semibold hover:underline"
								>
									{bioExpanded
										? tReviews('showLess')
										: tReviews('showMore')}
								</button>
							) : null}
						</div>
					) : null}

					{displayPhone && (
						<a
							href={`tel:${displayPhone}`}
							className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
						>
							<Phone className="size-3.5 shrink-0" />
							{displayPhone}
						</a>
					)}

					{displayAddress && (
						<p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
							<MapPin className="size-3.5 shrink-0" />
							{displayAddress}
						</p>
					)}

					{displayWebsite && (
						<a
							href={displayWebsite}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
						>
							<Globe className="size-3.5 shrink-0" />
							{displayWebsite.replace(/^https?:\/\//, '')}
						</a>
					)}
				</div>
				<ReviewSection
					targetType="User"
					targetId={staffId}
					currentUserId={currentUserId}
					onSummaryChange={setSummary}
				/>
			</SheetContent>
		</Sheet>
	)
}

export { StaffInfoSheet }
