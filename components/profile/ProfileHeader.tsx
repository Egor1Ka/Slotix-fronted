import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileHeaderProps {
	avatar: string
	name: string
	subtitle?: string
	badges?: React.ReactNode
}

const getInitial = (name: string) => {
	const trimmed = name.trim()
	return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

function ProfileHeader({ avatar, name, subtitle, badges }: ProfileHeaderProps) {
	return (
		<div
			data-slot="profile-header"
			className="flex items-center gap-4 rounded-lg border p-4"
		>
			<Avatar className="size-16">
				<AvatarImage src={avatar} alt={name} />
				<AvatarFallback>{getInitial(name)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h2 className="truncate text-xl font-semibold">{name}</h2>
				{subtitle ? (
					<p className="text-muted-foreground truncate text-sm">{subtitle}</p>
				) : null}
				{badges ? <div className="mt-1 flex flex-wrap gap-2">{badges}</div> : null}
			</div>
		</div>
	)
}

export { ProfileHeader }
export type { ProfileHeaderProps }
