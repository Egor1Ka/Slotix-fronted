'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { bookingStatusApi } from '@/lib/booking-api-client'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

const STATUS_COLORS = [
	'blue',
	'green',
	'red',
	'yellow',
	'purple',
	'orange',
	'gray',
	'teal',
]

const COLOR_CLASS: Record<string, string> = {
	blue: 'bg-blue-500',
	green: 'bg-green-500',
	red: 'bg-red-500',
	yellow: 'bg-yellow-400',
	purple: 'bg-purple-500',
	orange: 'bg-orange-500',
	gray: 'bg-gray-400',
	teal: 'bg-teal-500',
}

const AVAILABLE_ACTIONS = [
	{ value: 'hideFromSchedule', labelKey: 'hideFromSchedule' as const },
]

interface BookingStatusesManagerProps {
	orgId?: string
}

interface StatusFormState {
	label: string
	color: string
	actions: string[]
}

const DEFAULT_FORM: StatusFormState = {
	label: '',
	color: 'blue',
	actions: [],
}

function ColorDot({
	color,
	size = 'md',
}: {
	color: string
	size?: 'sm' | 'md'
}) {
	return (
		<span
			className={cn(
				'shrink-0 rounded-full',
				COLOR_CLASS[color] ?? 'bg-gray-400',
				size === 'sm' ? 'size-2.5' : 'size-3.5',
			)}
		/>
	)
}

function BookingStatusesManager({ orgId }: BookingStatusesManagerProps) {
	const t = useTranslations('booking')

	const [statuses, setStatuses] = useState<BookingStatusObject[]>([])
	const [loading, setLoading] = useState(true)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingStatus, setEditingStatus] = useState<
		BookingStatusObject | undefined
	>(undefined)
	const [form, setForm] = useState<StatusFormState>(DEFAULT_FORM)
	const [saving, setSaving] = useState(false)

	const fetchStatuses = useCallback(async () => {
		try {
			const data = await bookingStatusApi.getAll(orgId)
			setStatuses(data)
		} catch {
			// Toast показано інтерцептором
		} finally {
			setLoading(false)
		}
	}, [orgId])

	useEffect(() => {
		fetchStatuses()
	}, [fetchStatuses])

	const openCreateDialog = () => {
		setEditingStatus(undefined)
		setForm(DEFAULT_FORM)
		setDialogOpen(true)
	}

	const openEditDialog = (status: BookingStatusObject) => () => {
		setEditingStatus(status)
		setForm({
			label: status.label,
			color: status.color,
			actions: status.actions,
		})
		setDialogOpen(true)
	}

	const closeDialog = () => {
		setDialogOpen(false)
	}

	const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((prev) => ({ ...prev, label: e.target.value }))
	}

	const handleColorSelect = (color: string) => () => {
		setForm((prev) => ({ ...prev, color }))
	}

	const handleActionToggle = (value: string) => (checked: boolean) => {
		setForm((prev) => ({
			...prev,
			actions: checked
				? [...prev.actions, value]
				: prev.actions.filter((a) => a !== value),
		}))
	}

	const handleSave = async () => {
		if (!form.label.trim()) return

		setSaving(true)
		try {
			if (editingStatus) {
				await bookingStatusApi.update(editingStatus.id, {
					label: form.label,
					color: form.color,
					actions: form.actions,
				})
				toast.success(t('statusUpdated'))
			} else {
				await bookingStatusApi.create({
					label: form.label,
					color: form.color,
					actions: form.actions,
					orgId,
				})
				toast.success(t('statusCreated'))
			}
			closeDialog()
			fetchStatuses()
		} catch {
			// Toast показано інтерцептором
		} finally {
			setSaving(false)
		}
	}

	const handleArchive = (status: BookingStatusObject) => async () => {
		if (status.isDefault) {
			toast.error(t('cannotArchiveDefault'))
			return
		}
		try {
			await bookingStatusApi.archive(status.id)
			toast.success(t('statusArchived'))
			fetchStatuses()
		} catch {
			// Toast показано інтерцептором
		}
	}

	const handleRestore = (status: BookingStatusObject) => async () => {
		try {
			await bookingStatusApi.restore(status.id)
			toast.success(t('statusRestored'))
			fetchStatuses()
		} catch {
			// Toast показано інтерцептором
		}
	}

	const renderActionBadges = (actions: string[]) =>
		actions.map((action) => (
			<Badge key={action} variant="secondary" className="text-xs">
				{t(action as Parameters<typeof t>[0])}
			</Badge>
		))

	const renderStatusRow = (status: BookingStatusObject) => (
		<div
			key={status.id}
			className={cn(
				'group flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-opacity',
				status.isArchived && 'opacity-50',
			)}
		>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<ColorDot color={status.color} />
				<span
					className={cn(
						'truncate text-sm font-medium',
						status.isArchived && 'line-through',
					)}
				>
					{status.isDefault
						? t(status.label as Parameters<typeof t>[0])
						: status.label}
				</span>
				{status.isDefault && (
					<Badge variant="outline" className="shrink-0 text-xs">
						{t('defaultStatus')}
					</Badge>
				)}
				{status.actions.length > 0 && (
					<div className="hidden items-center gap-1 sm:flex">
						{renderActionBadges(status.actions)}
					</div>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{!status.isArchived && (
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={openEditDialog(status)}
					>
						<PencilIcon className="size-3.5" />
					</Button>
				)}
				{status.isArchived ? (
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleRestore(status)}
					>
						<ArchiveRestoreIcon className="size-3.5" />
					</Button>
				) : (
					<Button
						variant="ghost"
						size="icon-sm"
						disabled={status.isDefault}
						onClick={handleArchive(status)}
					>
						<ArchiveIcon className="size-3.5" />
					</Button>
				)}
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

	const activeStatuses = statuses.filter((s) => !s.isArchived)
	const archivedStatuses = statuses.filter((s) => s.isArchived)

	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{t('bookingStatuses')}</h2>
				<Button onClick={openCreateDialog}>
					<Plus className="mr-1 size-4" />
					{t('addStatus')}
				</Button>
			</div>

			{activeStatuses.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyTitle>{t('bookingStatuses')}</EmptyTitle>
						<EmptyDescription>{t('addStatus')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="space-y-2">{activeStatuses.map(renderStatusRow)}</div>
			)}

			{archivedStatuses.length > 0 && (
				<>
					<Separator />
					<div className="space-y-2">
						{archivedStatuses.map(renderStatusRow)}
					</div>
				</>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingStatus ? t('editStatus') : t('createStatus')}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 py-2">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">{t('statusLabel')}</label>
							<Input
								value={form.label}
								onChange={handleLabelChange}
								placeholder={t('statusLabel')}
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-sm font-medium">{t('statusColor')}</label>
							<div className="flex flex-wrap gap-2">
								{STATUS_COLORS.map((color) => (
									<button
										key={color}
										type="button"
										onClick={handleColorSelect(color)}
										className={cn(
											'size-7 rounded-full transition-transform hover:scale-110',
											COLOR_CLASS[color] ?? 'bg-gray-400',
											form.color === color &&
												'ring-foreground ring-2 ring-offset-2',
										)}
									/>
								))}
							</div>
						</div>

						{AVAILABLE_ACTIONS.length > 0 && (
							<div className="space-y-2">
								<label className="text-sm font-medium">
									{t('statusActions')}
								</label>
								{AVAILABLE_ACTIONS.map(({ value, labelKey }) => (
									<div key={value} className="flex items-center gap-2">
										<Checkbox
											id={`action-${value}`}
											checked={form.actions.includes(value)}
											onCheckedChange={handleActionToggle(value)}
										/>
										<label
											htmlFor={`action-${value}`}
											className="cursor-pointer text-sm"
										>
											{t(labelKey)}
										</label>
									</div>
								))}
							</div>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={closeDialog} disabled={saving}>
							{t('cancel')}
						</Button>
						<Button
							onClick={handleSave}
							disabled={saving || !form.label.trim()}
						>
							{saving ? (
								<Spinner className="size-4" />
							) : editingStatus ? (
								t('editStatus')
							) : (
								t('createStatus')
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export { BookingStatusesManager }
