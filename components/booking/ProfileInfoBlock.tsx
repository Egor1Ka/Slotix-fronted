'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, Phone, Globe } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

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

const MAX_DESCRIPTION_LENGTH = 200

const getInitial = (name: string): string => name.charAt(0).toUpperCase()

const truncateDescription = (text: string): string =>
	`${text.slice(0, MAX_DESCRIPTION_LENGTH)}...`

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
	const [expanded, setExpanded] = useState(false)

	const hasContactInfo = address || phone || website
	const hasDescription = description && description.length > 0
	const isLongDescription =
		hasDescription && description.length > MAX_DESCRIPTION_LENGTH

	if (!hasDescription && !hasContactInfo) return null

	const toggleExpanded = () => setExpanded((prev) => !prev)

	const displayedDescription =
		hasDescription && !expanded && isLongDescription
			? truncateDescription(description)
			: description

	const imageSource = isOrg ? logo : avatar

	return (
		<div className="bg-card w-full border-b px-6 py-4">
			<div className="mx-auto flex max-w-5xl items-start gap-4">
				{isOrg && imageSource ? (
					<img
						src={imageSource}
						alt={name}
						className="size-12 shrink-0 rounded-lg object-cover"
					/>
				) : (
					<Avatar className="size-12 shrink-0">
						<AvatarImage src={imageSource ?? undefined} />
						<AvatarFallback>{getInitial(name)}</AvatarFallback>
					</Avatar>
				)}

				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<h2 className="text-base font-semibold">{name}</h2>

					{hasDescription && (
						<div className="text-muted-foreground text-sm leading-relaxed">
							<p>{displayedDescription}</p>
							{isLongDescription && (
								<button
									type="button"
									onClick={toggleExpanded}
									className="text-primary mt-0.5 text-xs hover:underline"
								>
									{expanded ? t('showLess') : t('showMore')}
								</button>
							)}
						</div>
					)}

					{hasContactInfo && (
						<>
							{hasDescription && <Separator className="my-1" />}
							<div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
									>
										<Globe className="size-3.5 shrink-0" />
										{website.replace(/^https?:\/\//, '')}
									</a>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

export { ProfileInfoBlock }
export type { ProfileInfoBlockProps }
