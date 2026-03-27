'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { OrgListItem } from '@/services'

// Маппинг ролей на варианты Badge
const ROLE_VARIANT = {
	owner: 'default',
	admin: 'secondary',
	member: 'outline',
} as const

// Маппинг статусов на цвета индикаторов
const STATUS_COLOR = {
	active: 'bg-green-500',
	invited: 'bg-yellow-500',
	suspended: 'bg-red-500',
	left: 'bg-gray-400',
} as const

interface OrgCardProps {
	org: OrgListItem
}

function OrgCard({ org }: OrgCardProps) {
	const router = useRouter()
	const locale = useLocale()
	const tRole = useTranslations('organizations.role')
	const tStatus = useTranslations('organizations.status')

	const handleClick = () => {
		router.push(`/${locale}/manage/${org.id}`)
	}

	const getInitial = (name: string): string => name.charAt(0).toUpperCase()

	return (
		<Card
			className="cursor-pointer transition-shadow hover:shadow-md"
			onClick={handleClick}
		>
			<CardContent className="flex items-center gap-4 p-4">
				{org.logo ? (
					<img
						src={org.logo}
						alt={org.name}
						className="size-12 rounded-lg object-cover"
					/>
				) : (
					<div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-lg text-lg font-bold">
						{getInitial(org.name)}
					</div>
				)}
				<div className="flex-1">
					<h3 className="font-semibold">{org.name}</h3>
					<div className="mt-1 flex items-center gap-2">
						<Badge variant={ROLE_VARIANT[org.role]}>
							{tRole(org.role)}
						</Badge>
						<div className="flex items-center gap-1">
							<div
								className={`size-2 rounded-full ${STATUS_COLOR[org.status]}`}
							/>
							<span className="text-muted-foreground text-xs">
								{tStatus(org.status)}
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export { OrgCard }
