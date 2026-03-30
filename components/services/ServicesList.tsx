'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { PencilIcon, Plus, Trash2Icon } from 'lucide-react'
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
import { eventTypeApi } from '@/services'
import { eventTypeApi as bookingEventTypeApi } from '@/lib/booking-api-client'
import type { EventType } from '@/services'

const POLICY_BADGE_VARIANT = {
	any: 'default',
	by_position: 'secondary',
	specific: 'outline',
} as const

interface ServicesListProps {
	orgId: string
	currency: string
}

function ServicesList({ orgId, currency }: ServicesListProps) {
	const t = useTranslations('services')
	const [services, setServices] = useState<EventType[]>([])
	const [loading, setLoading] = useState(true)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingService, setEditingService] = useState<
		EventType | undefined
	>(undefined)
	const [deleteTarget, setDeleteTarget] = useState<EventType | undefined>(
		undefined,
	)

	const fetchServices = useCallback(async () => {
		try {
			const data = await bookingEventTypeApi.getByOrg(orgId)
			setServices(data)
		} catch {
			// Toast вже показано інтерцептором
		} finally {
			setLoading(false)
		}
	}, [orgId])

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

	const renderService = (service: EventType) => (
		<div
			key={service.id}
			className="flex items-center justify-between rounded-lg border p-3"
		>
			<div className="flex items-center gap-3">
				<span
					className="size-4 shrink-0 rounded-full"
					style={{ backgroundColor: service.color }}
				/>
				<div>
					<div className="text-sm font-medium">{service.name}</div>
					<div className="text-muted-foreground text-xs">
						{service.durationMin} {t('durationMin')} &middot;{' '}
						{service.price} {service.currency}
					</div>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Badge variant={POLICY_BADGE_VARIANT[service.staffPolicy]}>
					{getPolicyLabel(service.staffPolicy)}
				</Badge>
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
	)

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-6" />
			</div>
		)
	}

	return (
		<div className="space-y-4">
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
							{t('emptyDescription')}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="space-y-2">
					{services.map(renderService)}
				</div>
			)}

			<ServiceDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				orgId={orgId}
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
						<AlertDialogAction
							variant="destructive"
							onClick={handleDelete}
						>
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export { ServicesList }
