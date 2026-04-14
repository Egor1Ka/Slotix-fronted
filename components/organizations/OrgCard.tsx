'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogAction,
	AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { orgApi } from '@/services'
import type { OrgListItem } from '@/services'

const ROLE_VARIANT = {
	owner: 'default',
	admin: 'secondary',
	member: 'outline',
} as const

const STATUS_COLOR = {
	active: 'bg-green-500',
	invited: 'bg-yellow-500',
	suspended: 'bg-red-500',
	left: 'bg-gray-400',
} as const

interface OrgCardProps {
	org: OrgListItem
	onInvitationHandled: () => void
}

function OrgCard({ org, onInvitationHandled }: OrgCardProps) {
	const router = useRouter()
	const locale = useLocale()
	const tRole = useTranslations('organizations.role')
	const tStatus = useTranslations('organizations.status')
	const tInvite = useTranslations('organizations.invitation')

	const [dialogOpen, setDialogOpen] = useState(false)
	const [processing, setProcessing] = useState(false)

	const isInvited = org.status === 'invited'
	const ADMIN_ROLES = ['owner', 'admin']
	const isAdmin = ADMIN_ROLES.includes(org.role)
	const orgPath = isAdmin ? `/${locale}/manage/${org.id}` : `/${locale}/org/${org.id}/my-schedule`

	const handleClick = () => {
		if (isInvited) {
			setDialogOpen(true)
			return
		}
		router.push(orgPath)
	}

	const handleAccept = async () => {
		setProcessing(true)
		try {
			await orgApi.acceptInvitation({ pathParams: { id: org.id }, body: {} })
			toast.success(tInvite('accepted'))
			setDialogOpen(false)
			onInvitationHandled()
			router.push(orgPath)
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setProcessing(false)
		}
	}

	const handleDecline = async () => {
		setProcessing(true)
		try {
			await orgApi.declineInvitation({ pathParams: { id: org.id } })
			toast.success(tInvite('declined'))
			setDialogOpen(false)
			onInvitationHandled()
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setProcessing(false)
		}
	}

	const getInitial = (name: string): string => name.charAt(0).toUpperCase()

	return (
		<>
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
							<Badge variant={ROLE_VARIANT[org.role]}>{tRole(org.role)}</Badge>
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

			<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{tInvite('title')}</AlertDialogTitle>
						<AlertDialogDescription>
							{tInvite('description', { orgName: org.name })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleDecline} disabled={processing}>
							{tInvite('decline')}
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleAccept} disabled={processing}>
							{tInvite('accept')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export { OrgCard }
