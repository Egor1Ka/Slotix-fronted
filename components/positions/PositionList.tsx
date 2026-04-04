'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { PencilIcon, Plus, Trash2Icon, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
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
	const [editingPosition, setEditingPosition] = useState<Position | undefined>(
		undefined,
	)
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
		<Card key={position.id} className="group transition-shadow hover:shadow-sm">
			<CardContent className="flex items-center justify-between p-4">
				<div className="flex items-center gap-4">
					<span
						className="size-8 shrink-0 rounded-full ring-2 ring-offset-2"
						style={
							{
								backgroundColor: position.color ?? '#94a3b8',
								'--tw-ring-color': position.color ?? '#94a3b8',
							} as React.CSSProperties
						}
					/>
					<div className="flex flex-col gap-1">
						<span className="text-base leading-none font-medium">
							{position.name}
						</span>
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="text-xs">
								{t('level')} {position.level}
							</Badge>
							<Badge variant="outline" className="gap-1 text-xs">
								<Users className="size-3" />
								{position.staffCount}
							</Badge>
						</div>
					</div>
				</div>
				<div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
			</CardContent>
		</Card>
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

			{positions.length === 0 ? (
				<Empty className="rounded-xl border border-dashed py-12">
					<EmptyHeader>
						<EmptyTitle>{t('empty')}</EmptyTitle>
						<EmptyDescription>{t('emptyDescription')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="space-y-2">{positions.map(renderPosition)}</div>
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
						<AlertDialogAction variant="destructive" onClick={handleDelete}>
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export { PositionList }
