'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, Phone, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface ProfileInfoBlockProps {
	name: string
	logo: string | null
	avatar: string | null
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	isOrg: boolean
}

const getInitial = (name: string): string => name.charAt(0).toUpperCase()

function ProfileInfoBlock({
	name,
	logo,
	avatar,
	description,
	address,
	phone,
	website,
	isOrg,
}: ProfileInfoBlockProps) {
	const t = useTranslations('profile')
	const [open, setOpen] = useState(false)

	const hasContactInfo = address || phone || website
	const hasDescription = description && description.length > 0
	const hasDetails = hasDescription || hasContactInfo

	if (!hasDetails) return null

	const toggleOpen = () => setOpen((prev) => !prev)

	const imageSource = isOrg ? logo : avatar
	const toggleLabel = open
		? t('hide')
		: isOrg
			? t('aboutUs')
			: t('about')

	return (
		<div className="bg-card w-full border-b">
			<div className="mx-auto max-w-5xl px-6">
				<button
					type="button"
					onClick={toggleOpen}
					className="flex w-full items-center gap-3 py-3 text-left"
				>
					{isOrg && imageSource ? (
						<img
							src={imageSource}
							alt={name}
							className="size-9 shrink-0 rounded-lg object-cover"
						/>
					) : (
						<Avatar className="size-9 shrink-0">
							<AvatarImage src={imageSource ?? undefined} />
							<AvatarFallback className="text-sm">
								{getInitial(name)}
							</AvatarFallback>
						</Avatar>
					)}

					<span className="flex-1 text-sm font-semibold">{name}</span>

					<span className="text-muted-foreground flex items-center gap-1 text-xs">
						{toggleLabel}
						{open ? (
							<ChevronUp className="size-4" />
						) : (
							<ChevronDown className="size-4" />
						)}
					</span>
				</button>

				<div
					className={cn(
						'grid transition-all duration-200 ease-in-out',
						open ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]',
					)}
				>
					<div className="overflow-hidden">
						<Separator className="mb-3" />

						{hasDescription && (
							<p className="text-muted-foreground mb-3 text-sm leading-relaxed">
								{description}
							</p>
						)}

						{hasContactInfo && (
							<div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
								{address && (
									<span className="flex items-center gap-1.5">
										<MapPin className="size-3.5 shrink-0" />
										{address}
									</span>
								)}
								{phone && (
									<a
										href={`tel:${phone}`}
										className="flex items-center gap-1.5 hover:underline"
										onClick={(e) => e.stopPropagation()}
									>
										<Phone className="size-3.5 shrink-0" />
										{phone}
									</a>
								)}
								{website && (
									<a
										href={website}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1.5 hover:underline"
										onClick={(e) => e.stopPropagation()}
									>
										<Globe className="size-3.5 shrink-0" />
										{website.replace(/^https?:\/\//, '')}
									</a>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export { ProfileInfoBlock }
export type { ProfileInfoBlockProps }
