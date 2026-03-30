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
import { Spinner } from '@/components/ui/spinner'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from '@/components/ui/empty'
import { PositionDialog } from '@/components/positions/PositionDialog'
import { positionApi } from '@/services'
import type { Position } from '@/services'

interface PositionListProps {
	orgId: string
}

function PositionList({ orgId }: PositionListProps) {
	const t = useTranslations('positions')
	const [positions, setPositions] = useState<Position[]>([])
	const [loading, setLoading] = useState(true)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingPosition, setEditingPosition] = useState<
		Position | undefined
	>(undefined)
	const [deleteTarget, setDeleteTarget] = useState<Position | undefined>(
		undefined,
	)

	const fetchPositions = useCallback(async () => {
		try {
			const response = await positionApi.getByOrg({
				pathParams: { orgId },
			})
			setPositions(response.data)
		} catch {
			// Toast вже показано інтерцептором
		} finally {
			setLoading(false)
		}
	}, [orgId])

	useEffect(() => {
		fetchPositions()
	}, [fetchPositions])

	const openCreateDialog = () => {
		setEditingPosition(undefined)
		setDialogOpen(true)
	}

	const openEditDialog = (position: Position) => () => {
		setEditingPosition(position)
		setDialogOpen(true)
	}

	const openDeleteDialog = (position: Position) => () => {
		setDeleteTarget(position)
	}

	const handleDelete = async () => {
		if (!deleteTarget) return

		try {
			await positionApi.remove({
				pathParams: { id: deleteTarget.id },
			})
			toast.success(t('deleted'))
			setDeleteTarget(undefined)
			fetchPositions()
		} catch {
			// Toast вже показано інтерцептором
		}
	}

	const handleDialogSuccess = () => {
		fetchPositions()
	}

	const renderPosition = (position: Position) => (
		<div
			key={position.id}
			className="flex items-center justify-between rounded-lg border p-3"
		>
			<div className="flex items-center gap-3">
				<span
					className="size-4 shrink-0 rounded-full"
					style={{ backgroundColor: position.color ?? '#94a3b8' }}
				/>
				<div>
					<div className="text-sm font-medium">{position.name}</div>
					<div className="text-muted-foreground text-xs">
						{t('level')}: {position.level} &middot; {t('staffCount')}:{' '}
						{position.staffCount}
					</div>
				</div>
			</div>
			<div className="flex gap-1">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={openEditDialog(position)}
				>
					<PencilIcon />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={openDeleteDialog(position)}
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

			{positions.length === 0 ? (
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
					{positions.map(renderPosition)}
				</div>
			)}

			<PositionDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				orgId={orgId}
				position={editingPosition}
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

export { PositionList }
