'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, Phone, Globe } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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

const MAX_DESCRIPTION_LENGTH = 150

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
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center gap-3">
				{isOrg && imageSource ? (
					<img
						src={imageSource}
						alt={name}
						className="size-8 rounded"
					/>
				) : (
					<Avatar className="size-8">
						<AvatarImage src={imageSource ?? undefined} />
						<AvatarFallback className="text-xs">
							{getInitial(name)}
						</AvatarFallback>
					</Avatar>
				)}
				<span className="text-sm font-semibold">{name}</span>
			</div>

			{hasDescription && (
				<div className="text-muted-foreground text-xs">
					<p>{displayedDescription}</p>
					{isLongDescription && (
						<button
							type="button"
							onClick={toggleExpanded}
							className="text-primary mt-1 hover:underline"
						>
							{expanded ? t('showLess') : t('showMore')}
						</button>
					)}
				</div>
			)}

			{hasContactInfo && (
				<div className="flex flex-col gap-1.5">
					{address && (
						<div className="text-muted-foreground flex items-center gap-2 text-xs">
							<MapPin className="size-3.5 shrink-0" />
							<span>{address}</span>
						</div>
					)}
					{phone && (
						<div className="text-muted-foreground flex items-center gap-2 text-xs">
							<Phone className="size-3.5 shrink-0" />
							<a href={`tel:${phone}`} className="hover:underline">
								{phone}
							</a>
						</div>
					)}
					{website && (
						<div className="text-muted-foreground flex items-center gap-2 text-xs">
							<Globe className="size-3.5 shrink-0" />
							<a
								href={website}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:underline"
							>
								{website}
							</a>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export { ProfileInfoBlock }
export type { ProfileInfoBlockProps }
