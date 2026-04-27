'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	BanknoteIcon,
	ClockIcon,
	PencilIcon,
	Plus,
	Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from '@/components/ui/empty'
import { ServiceDialog } from '@/components/services/ServiceDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { eventTypeApi } from '@/services'
import { eventTypeApi as bookingEventTypeApi } from '@/lib/booking-api-client'
import type { EventType } from '@/services'

const POLICY_BADGE_CLASS = {
	any: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
	by_position:
		'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
	specific:
		'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
} as const

interface ServicesListProps {
	ownerId: string
	ownerType: 'org' | 'user'
	currency: string
}

function ServicesList({ ownerId, ownerType, currency }: ServicesListProps) {
	const t = useTranslations('services')
	const [services, setServices] = useState<EventType[]>([])
	const [loading, setLoading] = useState(true)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingService, setEditingService] = useState<EventType | undefined>(
		undefined,
	)
	const [deleteTarget, setDeleteTarget] = useState<EventType | undefined>(
		undefined,
	)

	const fetchByOwnerType =
		ownerType === 'org'
			? bookingEventTypeApi.getByOrg
			: bookingEventTypeApi.getByStaff

	const fetchServices = useCallback(async () => {
		try {
			const data = await fetchByOwnerType(ownerId)
			setServices(data)
		} catch {
			// Toast вже показано інтерцептором
		} finally {
			setLoading(false)
		}
	}, [ownerId, fetchByOwnerType])

	useEffect(() => {
		fetchServices()
	}, [fetchServices])

	const openCreateDialog = () => {
		setEditingService(undefined)
		setDialogOpen(true)
	}

	const openEditDialog = (service: EventType) => () => {
		setEditingService(service)
		setDialogOpen(true)
	}

	const openDeleteDialog = (service: EventType) => () => {
		setDeleteTarget(service)
	}

	const handleDelete = async () => {
		if (!deleteTarget) return

		try {
			await eventTypeApi.remove({
				pathParams: { id: deleteTarget.id },
			})
			toast.success(t('deleted'))
			setDeleteTarget(undefined)
			fetchServices()
		} catch {
			// Toast вже показано інтерцептором
		}
	}

	const handleDialogSuccess = () => {
		fetchServices()
	}

	const getPolicyLabel = (policy: EventType['staffPolicy']) => {
		const labels = {
			any: t('staffPolicyAny'),
			by_position: t('staffPolicyByPosition'),
			specific: t('staffPolicySpecific'),
		}
		return labels[policy]
	}

	const getInitial = (text: string) =>
		text.trim() ? text.trim().charAt(0).toUpperCase() : '?'

	const renderService = (service: EventType) => (
		<div
			key={service.id}
			className="group bg-card relative flex items-center justify-between overflow-hidden rounded-lg border transition-shadow hover:shadow-sm"
		>
			<span
				className="absolute inset-y-0 left-0 w-1 shrink-0 rounded-l-lg"
				style={{ backgroundColor: service.color }}
			/>
			<div className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 pl-5">
				<Avatar className="size-10 shrink-0 rounded-md">
					{service.image ? <AvatarImage src={service.image} alt="" /> : null}
					<AvatarFallback
						className="text-sm"
						style={{ backgroundColor: service.color }}
					>
						{getInitial(service.name)}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="truncate text-base font-medium">{service.name}</div>
					<div className="mt-1 flex items-center gap-3">
						<span className="text-muted-foreground flex items-center gap-1 text-xs">
							<ClockIcon className="size-3 shrink-0" />
							{service.durationMin} {t('durationMin')}
						</span>
						<span className="text-muted-foreground flex items-center gap-1 text-xs">
							<BanknoteIcon className="size-3 shrink-0" />
							{service.price} {service.currency}
						</span>
					</div>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2 py-3 pr-3">
				{ownerType === 'org' && (
					<Badge
						variant="outline"
						className={cn(
							'hidden text-xs sm:inline-flex',
							POLICY_BADGE_CLASS[service.staffPolicy],
						)}
					>
						{getPolicyLabel(service.staffPolicy)}
					</Badge>
				)}
				<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={openEditDialog(service)}
					>
						<PencilIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={openDeleteDialog(service)}
					>
						<Trash2Icon />
					</Button>
				</div>
			</div>
		</div>
	)

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-6" />
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{t('title')}</h2>
				<Button onClick={openCreateDialog}>
					<Plus className="mr-1 size-4" />
					{t('add')}
				</Button>
			</div>

			{services.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyTitle>{t('empty')}</EmptyTitle>
						<EmptyDescription>
							{ownerType === 'org'
								? t('emptyDescription')
								: t('emptyDescriptionPersonal')}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="space-y-2">{services.map(renderService)}</div>
			)}

			<ServiceDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				ownerId={ownerId}
				ownerType={ownerType}
				currency={currency}
				eventType={editingService}
				onSuccess={handleDialogSuccess}
			/>

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(undefined)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('delete')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('deleteConfirm')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleDelete}>
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export { ServicesList }
