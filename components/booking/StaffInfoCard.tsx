'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface StaffInfoCardProps {
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

function StaffInfoCard({ name, avatar, position, bio }: StaffInfoCardProps) {
	const t = useTranslations('profile')
	const [expanded, setExpanded] = useState(false)

	const toggleExpanded = () => setExpanded((prev) => !prev)

	return (
		<div className="flex flex-col gap-3 pb-3">
			<div className="flex items-center gap-3">
				<Avatar className="size-10">
					<AvatarImage src={avatar} alt={name} />
					<AvatarFallback className="text-xs">
						{getInitials(name)}
					</AvatarFallback>
				</Avatar>
				<div className="flex flex-col">
					<span className="text-sm font-semibold">{name}</span>
					{position && (
						<span className="text-muted-foreground text-xs">{position}</span>
					)}
				</div>
			</div>

			{bio && (
				<div className="text-muted-foreground text-xs leading-relaxed">
					<p className={expanded ? '' : 'line-clamp-3'}>{bio}</p>
					{bio.length > 120 && (
						<button
							type="button"
							onClick={toggleExpanded}
							className="text-primary mt-1 text-xs hover:underline"
						>
							{expanded ? t('showLess') : t('showMore')}
						</button>
					)}
				</div>
			)}

			<Separator />
		</div>
	)
}

export { StaffInfoCard }
export type { StaffInfoCardProps }
