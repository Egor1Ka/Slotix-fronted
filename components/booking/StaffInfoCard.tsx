'use client'

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
	if (!bio && !position) return null

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
				<p className="text-muted-foreground text-xs leading-relaxed">{bio}</p>
			)}

			<Separator />
		</div>
	)
}

export { StaffInfoCard }
export type { StaffInfoCardProps }
